import * as XLSX from 'xlsx'
import { parseImageRows } from './imageService'
import {
    detectInheritanceDirective,
    parseOverrideTokens,
    applyInheritanceOverrides,
    normalizeContentKey,
    extractFirstNumber
} from './inheritanceService'

export async function parseData(url) {
    try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = 'Protocols'
        let worksheet = workbook.Sheets[sheetName]
        if (!worksheet) {
            // fallback to first sheet
            const first = workbook.SheetNames && workbook.SheetNames[0]
            worksheet = workbook.Sheets[first]
        }
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

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
            imageKeys.forEach(key => {
                const rawImages = row[key]
                if (!rawImages) return
                const parsed = parseImageRows(rawImages, {
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
