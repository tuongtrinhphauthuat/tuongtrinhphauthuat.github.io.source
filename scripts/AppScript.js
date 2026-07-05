// ==========================================
// GOOGLE APPS SCRIPT CHO THƯỜNG TRÌNH PHẪU THUẬT
// ==========================================
// Hướng dẫn cài đặt:
// 1. Mở file Google Sheet chứa dữ liệu của bạn.
// 2. Chọn menu Tiện ích mở rộng (Extensions) > Apps Script.
// 3. Xóa nội dung cũ và dán toàn bộ đoạn mã này vào.
// 4. Bấm Lưu (Save - biểu tượng đĩa mềm).
// 5. Chọn nút Triển khai (Deploy) > Triển khai mới (New deployment).
// 6. Chọn loại: Ứng dụng web (Web app).
// 7. Quyền truy cập: Bất kỳ ai (Anyone).
// 8. Bấm Triển khai (Deploy) và cấp quyền nếu được hỏi.
// 9. Copy "Web app URL" và dán vào phần Cài đặt trong web app Tường Trình Phẫu Thuật.

function doPost(e) {
  try {
    // Để hỗ trợ CORS từ trình duyệt mà không bị preflight OPTIONS block,
    // web app gửi lên dưới dạng text/plain.
    var payloadString = e.postData.contents;
    var data = JSON.parse(payloadString);

    var stt = data.stt;
    var columnName = data.columnName;
    var content = data.content;
    var mode = data.mode; // 'overwrite' or 'new'

    if (!stt || !columnName || !content) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Thiếu dữ liệu: stt, columnName, hoặc content'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();

    var headerRow = values[0];
    var rowIndex = -1;
    var colIndex = -1;

    // Tìm hàng dựa theo STT
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) === String(stt)) {
        rowIndex = r + 1; // Google Sheet index bắt đầu từ 1
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Không tìm thấy STT: ' + stt
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Xử lý Cột
    if (mode === 'overwrite') {
      // Tìm cột có sẵn
      for (var c = 0; c < headerRow.length; c++) {
        if (headerRow[c] === columnName) {
          colIndex = c + 1;
          break;
        }
      }
      if (colIndex === -1) {
         return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Không tìm thấy cột để ghi đè: ' + columnName
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      // Chế độ tạo cột mới (new)
      // Tìm xem tên cột đã tồn tại chưa (tránh trùng lặp)
      for (var c = 0; c < headerRow.length; c++) {
        if (headerRow[c] === columnName) {
          colIndex = c + 1;
          break;
        }
      }
      // Nếu chưa có, tạo cột mới ở cuối
      if (colIndex === -1) {
        colIndex = headerRow.length + 1;
        sheet.getRange(1, colIndex).setValue(columnName);
      }
    }

    // Cập nhật nội dung
    sheet.getRange(rowIndex, colIndex).setValue(content);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Đã cập nhật thành công.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
