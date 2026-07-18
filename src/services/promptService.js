export const generateRewritePrompt = (currentTemplate, userInfo, protocolVersions = []) => {
  // Add context from other versions as examples
  let examplesText = '';
  if (protocolVersions && protocolVersions.length > 1) {
    examplesText = "\n\nTham khảo các phiên bản (version) khác của protocol này để hiểu rõ hơn cách điền:\n";
    protocolVersions.forEach(v => {
      if (v.displayContent && v.displayContent !== currentTemplate) {
        examplesText += `--- Phiên bản: ${v.title || 'Mặc định'} ---\n${v.displayContent}\n\n`;
      }
    });
  }

  return `Bạn là một trợ lý y khoa chuyên viết tường trình phẫu thuật.
Dưới đây là một mẫu protocol tường trình phẫu thuật (Template) với các chỗ trống được ký hiệu là "..." và các lựa chọn trắc nghiệm nằm trong ngoặc vuông (ví dụ: [Trái/Phải], hoặc [*Có/Không]).

Dựa vào thông tin tóm tắt của ca mổ do bác sĩ cung cấp, hãy điền các thông tin vào chỗ "..." và chọn/giữ lại giá trị đúng nhất trong các ngoặc vuông "[...]".
- CHỈ TRẢ VỀ DUY NHẤT 1 PHIÊN BẢN CỦA VĂN BẢN ĐÃ ĐIỀN, không cung cấp nhiều lựa chọn.
- Không bọc câu trả lời bằng Markdown formatting (như \`\`\`html hay \`\`\`), chỉ trả về nội dung nguyên bản.
- Chỉ trả về ĐÚNG cấu trúc văn bản của Template. Không thêm bớt câu chữ ngoài lề, không giải thích.
- Đảm bảo giữ nguyên các biến số dạng $tên$ nếu có.
- Chỗ nào thông tin bác sĩ cung cấp không có, giữ nguyên trạng thái chưa điền "..." hoặc giữ giá trị mặc định của ngoặc vuông.

THÔNG TIN BÁC SĨ CUNG CẤP:
${userInfo}

MẪU TƯỜNG TRÌNH (TEMPLATE) CẦN ĐIỀN:
${currentTemplate}
${examplesText}

Hãy trả về DUY NHẤT một văn bản hoàn chỉnh sau khi điền. KHÔNG TRẢ LỜI BẤT KỲ CÂU NÀO KHÁC NGOÀI VĂN BẢN ĐÃ ĐIỀN.
`;
}
