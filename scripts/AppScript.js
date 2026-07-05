// This Google Apps Script is used to receive push requests from the app
// and update the target Google Sheet accordingly.

function doPost(e) {
  try {
    // Enable CORS
    var headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (e.postData.type !== 'application/json') {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid content type" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var targetSheetUrl = data.sheetUrl; // We will pass this from the app
    var stt = data.stt;
    var name = data.name;
    var content = data.content;
    var title = data.title;
    var mode = data.mode; // 'new' or 'overwrite'
    var originalColumnName = data.originalColumnName;

    if (!targetSheetUrl) {
      throw new Error("No sheetUrl provided");
    }

    var ss = SpreadsheetApp.openByUrl(targetSheetUrl);
    var sheet = ss.getSheetByName("Protocols") || ss.getSheets()[0];

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headersRow = values[0];

    // Find the row
    var targetRowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (
        (stt && values[i][headersRow.indexOf("STT")] == stt) ||
        (name && values[i][headersRow.indexOf("Tên")] == name) ||
        (name && values[i][headersRow.indexOf("Tên phẫu thuật")] == name)
      ) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error("Protocol not found in sheet.");
    }

    var targetColIndex = -1;

    if (mode === "overwrite" && originalColumnName) {
      targetColIndex = headersRow.indexOf(originalColumnName);
    }

    if (targetColIndex === -1) {
      // Find new column
      // First try to find an existing empty "Nội dung" column
      for (var j = 0; j < headersRow.length; j++) {
        var h = String(headersRow[j] || "").toLowerCase();
        if (h.startsWith("nội dung")) {
          if (!values[targetRowIndex][j]) {
            targetColIndex = j;
            break;
          }
        }
      }

      // If still not found, create a new column
      if (targetColIndex === -1) {
        targetColIndex = headersRow.length;
        sheet.getRange(1, targetColIndex + 1).setValue("Nội dung " + (targetColIndex));
      }
    }

    // Format the content
    var finalContent = content;
    if (title) {
        finalContent = "(#" + title + ")\n" + finalContent;
    }

    // Write the content
    sheet.getRange(targetRowIndex + 1, targetColIndex + 1).setValue(finalContent);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle OPTIONS request for CORS preflight
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };

  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
