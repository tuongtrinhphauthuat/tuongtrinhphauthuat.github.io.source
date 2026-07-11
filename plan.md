1. **Thêm quy luật biến nghịch đảo (`$^ben$`)**
   - Sửa hàm `parseBracketsToHtml` trong `src/services/bracketService.js`:
     Khi duyệt qua `varDefs`, ta sẽ kiểm tra xem `finalHtml` có chứa `$^[tên biến]$` hay không. Nếu có, ta tính giá trị kế tiếp trong chuỗi giá trị và tạo ra `span` hiển thị. Ta phải `replace` `$^[tên biến]$` trước `$tên biến$`.
   - Sửa hàm `replaceVarTokensInDom` để cũng hỗ trợ `$^[tên biến]$` bên cạnh `$tên biến$`.
   - Sửa hàm `applyVarChoiceInDom` để cập nhật cả các `span` biến nghịch đảo (ta sẽ đánh dấu thêm `data-var-inverse="true"` để dễ tìm).

2. **Thêm quy luật điền (input) của source code (dấu `...`)**
   - Sửa hàm `formatInlineToHtml` trong `src/services/bracketService.js` (hoặc trực tiếp xử lý văn bản ở `parseBracketsToHtml`).
   - Ta sẽ chuyển đổi dấu `...` thành `<span class="bracket-input" contenteditable="true" ...></span>`. Do editor (`#viewer-content-editable`) của `ProtocolViewer.vue` đang có `contenteditable="true"`, ta chỉ cần thêm style hoặc một span rỗng mà có `contenteditable="true"` để user nhập trực tiếp, HOẶC chỉ đơn giản để user tự nhập vào, tuy nhiên nếu ta muốn thay thế `...` ngay khi nhập, có thể sẽ cần xử lý event.
   - Khoan, yêu cầu là: "những vị trí có dấu ba chấm ... Thì mặc định sẽ cho người dùng điền tay giá trị tại vị trí đó. Khi người dùng điền thì dấu ... Sẽ bị thay thế luôn."
     Nếu ta dùng `<span class="bracket-input" contenteditable="true" placeholder="..."></span>` trong khi editor đã `contenteditable="true"` thì có thể hơi thừa.
     Thực ra, nếu `editor` đã là `contenteditable="true"`, thì người dùng vốn có thể nhập văn bản thoải mái! Dấu `...` có thể hiển thị như văn bản bình thường. Vấn đề là "Khi người dùng điền thì dấu ... Sẽ bị thay thế luôn". Điều này có thể giải quyết bằng CSS (ví dụ một thẻ `span` mà có chữ `...` mờ, khi focus hoặc click thì biến mất và cho nhập) HOẶC nó đơn giản là một span đặc biệt `contenteditable="true"` (nếu các span khác là `contenteditable="false"`). Do toàn bộ editor đã `contenteditable="true"`, ta có thể bọc `...` vào `<span class="bracket-input" data-placeholder="..."></span>`, khi có thay đổi văn bản thì xóa placeholder đi...
     Cụ thể: ta có thể chuyển `...` thành `&nbsp;&nbsp;&nbsp;` (nếu không muốn dùng input).
     Hoặc đơn giản nhất, ta có thể tạo thẻ `<span class="bracket-input" contenteditable="true" style="...">(dấu ...)</span>`. Khi người dùng gõ vào, css sẽ ẩn dấu ... (dùng `:empty::before`).

3. **Có tab chuyển đổi protocol trong editor giữa source-code và bản hiển thị tương tác**
   - Trong `ProtocolViewer.vue` hoặc `ProtocolDisplay.vue`, thêm một tab hoặc nút bấm để xem/sửa **Source Code**.
   - Nếu ở Source Code, hiển thị `<textarea>` hoặc `editor` plain text. Khi sửa source code, chuyển về Interactive Mode nó sẽ được parse lại và hiển thị lên.
   - Điều này đã có ở đâu chưa? Hiện tại có `viewerContentOverride` hoặc có `copySource` nhưng chưa có tab Source Code. Ta sẽ thêm vào UI của `ProtocolViewer.vue`.

4. **Khi copy nội dung protocol đã chỉnh sửa bạn phải loại bỏ các hàng trống trong bản copy**
   - Trong `getPlainTextFromContainer` (file `bracketService.js`), hoặc `htmlToSource` (file `bracketReverseService.js`) ta xử lý loại bỏ các hàng trống (ví dụ `replace(/\n\s*\n/g, '\n')` hoặc tương tự tùy vào chỗ copy).
   - Sửa hàm `onCopy` trong `ProtocolViewer.vue` hoặc ở `ProtocolDisplay.vue` nơi thực hiện copy để loại bỏ các dòng trống.

5. **Cập nhật USER_GUIDE.md**
   - Đưa các quy luật mới vào trong hướng dẫn. Đã patch thành công 1 phần, sẽ review lại và patch chính xác nếu cần.
