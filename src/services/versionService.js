import * as XLSX from 'xlsx'
import { XMLParser } from 'fast-xml-parser'
import { parseImageRows, mergeImageHyperlinks } from './imageService'
import {
    detectInheritanceDirective,
    parseOverrideTokens,
    applyInheritanceOverrides,
    normalizeContentKey,
    extractFirstNumber
} from './inheritanceService'

const IMAGE_HEADER_PREFIX = 'hình ảnh'
const XML_PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    trimValues: false
}

function createXmlParser() {
    return new XMLParser(XML_PARSER_OPTIONS)
}

function ensureArray(value) {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
}

function resolveSheetFilePath(workbook, sheetName) {
    if (!workbook?.files || !workbook?.Workbook?.Sheets?.length) return null
    const sheets = workbook.Workbook.Sheets
    const targetSheet = sheets.find(entry => entry.name === sheetName) || sheets[0]
    if (!targetSheet?.id) return null
    const relsEntry = workbook.files['xl/_rels/workbook.xml.rels']
    if (!relsEntry?.content) return null
    const relsXml = relsEntry.content.toString('utf8')
    const relRegex = new RegExp(`<Relationship[^>]*Id="${targetSheet.id}"[^>]*Target="([^"]+)"`, 'i')
    const match = relsXml.match(relRegex)
    if (!match) return null
    let target = match[1]
    if (!target) return null
    while (target.startsWith('../')) {
        target = target.slice(3)
    }
    if (target.startsWith('/')) {
        target = target.replace(/^\/+/, '')
    }
    if (!target.startsWith('xl/')) {
        target = `xl/${target}`
    }
    return target
}

function parseRelationshipTargets(xml) {
    if (!xml) return new Map()
    const parser = createXmlParser()
    const doc = parser.parse(xml)
    const entries = doc?.Relationships?.Relationship
    const relationships = ensureArray(entries)
    const map = new Map()
    relationships.forEach(rel => {
        const id = rel?.['@_Id'] || rel?.['@_id']
        const target = rel?.['@_Target']
        if (id && target) {
            map.set(id, target)
        }
    })
    return map
}

function buildSharedStringHyperlinkIndex(files) {
    const entry = files?.['xl/sharedStrings.xml']
    if (!entry?.content) return new Map()

    const relEntry = files['xl/_rels/sharedStrings.xml.rels'] || files['xl/sharedStrings.xml.rels']
    const relMap = relEntry?.content ? parseRelationshipTargets(relEntry.content.toString('utf8')) : new Map()
    if (!relMap.size) return new Map()

    const parser = createXmlParser()
    const doc = parser.parse(entry.content.toString('utf8'))
    const nodes = doc?.sst?.si
    const list = ensureArray(nodes)
    const hyperlinkIndex = new Map()

    list.forEach((node, index) => {
        const runs = ensureArray(node?.r)
        const targets = []
        runs.forEach(run => {
            const hlink = run?.rPr?.hlinkClick
            if (!hlink) return
            ensureArray(hlink).forEach(linkNode => {
                const relId = linkNode?.['@_r:id'] || linkNode?.['@_id'] || linkNode?.['@_Id']
                const target = relMap.get(relId)
                if (target) {
                    targets.push(target)
                }
            })
        })
        if (targets.length) {
            hyperlinkIndex.set(index, targets)
        }
    })

    return hyperlinkIndex
}

function collectSharedStringCellLinks(files, sheetPath, headerMap, imageColumns, sharedIndexMap) {
    if (!files || !sheetPath || !sharedIndexMap?.size || !imageColumns?.size) return new Map()
    const entry = files[sheetPath]
    if (!entry?.content) return new Map()
    const parser = createXmlParser()
    const doc = parser.parse(entry.content.toString('utf8'))
    const rows = ensureArray(doc?.worksheet?.sheetData?.row)
    const cellMap = new Map()

    rows.forEach(row => {
        const cells = ensureArray(row?.c)
        cells.forEach(cell => {
            if (cell?.['@_t'] !== 's') return
            const address = cell?.['@_r']
            if (!address) return
            const value = Array.isArray(cell?.v) ? cell.v[0] : cell?.v
            const sharedIndex = Number(value)
            if (!Number.isFinite(sharedIndex)) return
            const targets = sharedIndexMap.get(sharedIndex)
            if (!targets?.length) return
            const coords = XLSX.utils.decode_cell(address)
            if (!imageColumns.has(coords.c)) return
            const headerName = headerMap.get(coords.c)
            if (!headerName) return
            const rowEntry = cellMap.get(coords.r) || {}
            rowEntry[headerName] = (rowEntry[headerName] || []).concat(targets)
            cellMap.set(coords.r, rowEntry)
        })
    })

    return cellMap
}

function buildHeaderColumnMap(worksheet) {
    const headers = new Map()
    if (!worksheet) return headers
    const ref = worksheet['!ref']
    if (!ref) return headers
    const range = XLSX.utils.decode_range(ref)
    const headerRow = range.s.r
    for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow, c })
        const cell = worksheet[addr]
        if (!cell) continue
        const raw = cell.w ?? cell.v
        if (raw == null) continue
        const headerName = String(raw).trim()
        if (headerName) headers.set(c, headerName)
    }
    return headers
}

function extractHyperlinkTargets(cell) {
    if (!cell || !cell.l) return []
    const targets = []
    const source = cell.l
    const addTarget = value => {
        const target = typeof value === 'string' ? value.trim() : typeof value?.Target === 'string' ? value.Target.trim() : typeof value?.target === 'string' ? value.target.trim() : ''
        if (target) targets.push(target)
    }
    if (Array.isArray(source)) {
        source.forEach(link => addTarget(link?.Target ?? link?.target ?? link))
    } else {
        addTarget(source)
    }
    return targets
}

function collectImageHyperlinks(worksheet, headerMap, workbook, sheetPath) {
    const hyperlinkMap = new Map()
    if (!worksheet || !headerMap?.size) return hyperlinkMap

    const imageColumns = new Set()
    headerMap.forEach((name, colIdx) => {
        if (!name) return
        if (name.toLowerCase().startsWith(IMAGE_HEADER_PREFIX)) {
            imageColumns.add(colIdx)
        }
    })
    if (!imageColumns.size) return hyperlinkMap

    Object.keys(worksheet).forEach(address => {
        if (!address || address[0] === '!') return
        const cell = worksheet[address]
        const targets = extractHyperlinkTargets(cell)
        if (!targets.length) return
        const coords = XLSX.utils.decode_cell(address)
        if (!imageColumns.has(coords.c)) return
        const headerName = headerMap.get(coords.c)
        if (!headerName) return
        const rowEntry = hyperlinkMap.get(coords.r) || {}
        rowEntry[headerName] = (rowEntry[headerName] || []).concat(targets)
        hyperlinkMap.set(coords.r, rowEntry)
    })

    if (workbook?.files && sheetPath) {
        const sharedIndexMap = buildSharedStringHyperlinkIndex(workbook.files)
        if (sharedIndexMap.size) {
            const sharedCellLinks = collectSharedStringCellLinks(
                workbook.files,
                sheetPath,
                headerMap,
                imageColumns,
                sharedIndexMap
            )
            sharedCellLinks.forEach((columns, rowIndex) => {
                const rowEntry = hyperlinkMap.get(rowIndex) || {}
                Object.keys(columns).forEach(headerName => {
                    rowEntry[headerName] = (rowEntry[headerName] || []).concat(columns[headerName])
                })
                hyperlinkMap.set(rowIndex, rowEntry)
            })
        }
    }

    return hyperlinkMap
}

export async function parseData(url) {
    try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array', bookFiles: true })
        let sheetName = 'Protocols'
        let worksheet = workbook.Sheets[sheetName]
        if (!worksheet) {
            const fallback = workbook.SheetNames && workbook.SheetNames[0]
            sheetName = fallback
            worksheet = workbook.Sheets[fallback]
        }
        if (!worksheet) {
            return []
        }

        const sheetPath = resolveSheetFilePath(workbook, sheetName)
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        const headerMap = buildHeaderColumnMap(worksheet)
        const imageHyperlinkMap = collectImageHyperlinks(worksheet, headerMap, workbook, sheetPath)

        return jsonData.map((row, index) => {
            const versions = []

            const contentKeys = Object.keys(row).filter(k => k.toLowerCase().startsWith('nội dung'))
            contentKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

            const processedColumns = new Map()
            const processedNumbers = new Map()

            const findParentMeta = (inheritInfo) => {
                if (!inheritInfo) return null
                if (inheritInfo.parentKeyNormalized) {
                    const meta = processedColumns.get(inheritInfo.parentKeyNormalized)
                    if (meta) return meta
                }
                if (inheritInfo.parentNumber && processedNumbers.has(inheritInfo.parentNumber)) {
                    return processedNumbers.get(inheritInfo.parentNumber)
                }
                return null
            }

            contentKeys.forEach(key => {
                let rawContent = row[key]
                if (!rawContent) return

                let title = `Version ${versions.length + 1}`
                const titleMatch = rawContent.match(/\(#(.*?)\)/)
                if (titleMatch) {
                    title = titleMatch[1].trim()
                }

                let workingContent = rawContent.replace(/\(#.*?\)/g, '').trim()
                const inheritDirective = detectInheritanceDirective(workingContent)
                let inheritMeta = null

                if (inheritDirective) {
                    const overridesInfo = parseOverrideTokens(inheritDirective.overridesText)
                    const parentMeta = findParentMeta(inheritDirective)
                    if (parentMeta && (parentMeta.rawContent || parentMeta.displayContent)) {
                        const parentSource = parentMeta.rawContent || parentMeta.displayContent
                        let inheritedContent = applyInheritanceOverrides(parentSource, overridesInfo.overrides)
                        if (overridesInfo.leftoverText) {
                            inheritedContent = `${inheritedContent}\n${overridesInfo.leftoverText}`.trim()
                        }
                        workingContent = inheritedContent
                        inheritMeta = {
                            parentKey: parentMeta.key,
                            parentVersionId: parentMeta.version.id,
                            parentTitle: parentMeta.version.title,
                            directive: inheritDirective.directiveBody,
                            overridesRaw: inheritDirective.overridesText,
                            overrides: overridesInfo.overrides
                        }
                        if (overridesInfo.leftoverText) {
                            inheritMeta.leftoverText = overridesInfo.leftoverText
                        }
                    } else {
                        inheritMeta = {
                            directive: inheritDirective.directiveBody,
                            overridesRaw: inheritDirective.overridesText,
                            warning: 'parent-not-found'
                        }
                        if (inheritDirective.overridesText) {
                            workingContent = inheritDirective.overridesText
                        }
                    }
                }

                const versionEntry = {
                    id: `v${versions.length + 1}`,
                    title,
                    originalTitle: title,
                    content: rawContent,
                    displayContent: workingContent,
                    rawContent: workingContent,
                    inherit: inheritMeta,
                    isInherited: Boolean(inheritMeta && inheritMeta.parentVersionId)
                }

                versions.push(versionEntry)

                const normalizedKey = normalizeContentKey(key)
                const numberKey = extractFirstNumber(key)
                const columnMeta = {
                    key,
                    normalizedKey,
                    numberKey,
                    version: versionEntry,
                    displayContent: workingContent,
                    rawContent: workingContent
                }
                if (normalizedKey) {
                    processedColumns.set(normalizedKey, columnMeta)
                }
                if (numberKey) {
                    processedNumbers.set(numberKey, columnMeta)
                }
            })

            const imageKeys = Object.keys(row).filter(k => k && k.toLowerCase().startsWith('hình ảnh'))
            imageKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
            let images = []
            const rowHyperlinks = typeof row.__rowNum__ === 'number' ? imageHyperlinkMap.get(row.__rowNum__) : null
            imageKeys.forEach(key => {
                const rawImages = row[key]
                const hyperlinkTargets = rowHyperlinks?.[key]
                const enrichedRaw = hyperlinkTargets?.length ? mergeImageHyperlinks(rawImages, hyperlinkTargets) : rawImages
                if (!enrichedRaw) return
                const parsed = parseImageRows(enrichedRaw, {
                    idPrefix: `p${index + 1}`,
                    startIndex: images.length
                })
                if (parsed.length) images = images.concat(parsed)
            })

            return {
                id: index + 1,
                stt: row['STT'],
                name: row['Tên'] || row['Tên phẫu thuật'] || row['Tên Protocol'] || 'Unnamed Protocol',
                versions,
                images
            }
        })
    } catch (error) {
        console.error('Error parsing XLSX:', error)
        return []
    }
}
