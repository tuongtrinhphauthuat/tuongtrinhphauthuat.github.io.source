import * as XLSX from 'xlsx'

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

            // Find all keys that start with "Nội dung"
            const contentKeys = Object.keys(row).filter(k => k.toLowerCase().startsWith('nội dung'))

            // Sort keys to ensure order (Nội dung 1, Nội dung 2...)
            contentKeys.sort((a, b) => {
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            })

            contentKeys.forEach(key => {
                let rawContent = row[key]
                if (!rawContent) return

                // Extract title: (#Title)
                let title = `Version ${versions.length + 1}`
                const titleMatch = rawContent.match(/\(#(.*?)\)/)

                if (titleMatch) {
                    title = titleMatch[1].trim()
                }

                // Remove the title marker from the content for display
                const displayContent = rawContent.replace(/\(#.*?\)/g, '').trim()

                versions.push({
                    id: `v${versions.length + 1}`,
                    title,
                    originalTitle: title,
                    content: rawContent, // Keep original for reference if needed
                    displayContent
                })
            })

            return {
                id: index + 1,
                stt: row['STT'],
                name: row['Tên'] || row['Tên phẫu thuật'] || row['Tên Protocol'] || 'Unnamed Protocol',
                versions
            }
        })
    } catch (error) {
        console.error('Error parsing XLSX:', error)
        return []
    }
}
