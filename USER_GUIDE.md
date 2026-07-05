# Hướng dẫn Sử dụng Phần mềm Quản lý Protocol

Tài liệu này hướng dẫn chi tiết cách thiết lập dữ liệu Excel để sử dụng với phần mềm Protocol Phẫu thuật Ngoại Lồng ngực.

## 1. Cấu trúc File Excel

Phần mềm đọc dữ liệu từ file Excel (`.xlsx`). File cần tuân thủ các quy tắc sau:

*   **Sheet Name**: Dữ liệu nên được đặt trong sheet có tên là `Protocols`. Nếu không tìm thấy, phần mềm sẽ lấy sheet đầu tiên.
*   **Header Row**: Dòng đầu tiên của sheet được coi là tiêu đề cột.

### Các Cột Quan Trọng

| Tên Cột (Header) | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| **STT** | Số thứ tự của protocol. | Không |
| **Tên** (hoặc `Tên phẫu thuật`, `Tên Protocol`) | Tên hiển thị của protocol. | Có |
| **Nội dung...** (ví dụ `Nội dung 1`, `Nội dung A`, `Nội dung chính`...) | Bắt buộc bắt đầu bằng chữ "Nội dung". Phần sau có thể là bất kỳ ký tự nào (số, chữ, ký tự đặc biệt...). Hỗ trợ vô số cột nội dung (mỗi cột là một version). | Có |
| **Hình ảnh** (hoặc `Hình ảnh 1`...) | Chứa link ảnh và điều kiện hiển thị. | Không |

---

## 2. Hướng dẫn Hệ thống Ngoặc Vuông `[]` (Dành cho người mới bắt đầu)

Đây là phần quan trọng nhất giúp văn bản của bạn trở nên "thông minh". Bạn không cần biết lập trình, chỉ cần nhớ quy tắc đơn giản: **"Cái gì muốn thay đổi được thì nhét vào trong ngoặc vuông `[]`"**.

### Bài 1: Tạo danh sách lựa chọn (Trắc nghiệm)
Bạn muốn tạo một chỗ để bác sĩ chọn "Trái" hoặc "Phải"? Hãy dùng dấu gạch chéo `/` để ngăn cách các lựa chọn.

*   **Viết là**: `[Trái/Phải]`
*   **Hiển thị**: Ứng dụng sẽ **mặc định chọn giá trị đầu tiên** (ở đây là "Trái"). Khi ấn vào sẽ hiện mục lục để chọn "Trái" hoặc "Phải".
*   **Ví dụ**: `Phẫu thuật phổi [Trái/Phải]`

### Bài 2: Chọn sẵn đáp án (Mặc định)
Bạn muốn máy tính tự chọn sẵn một đáp án phổ biến nhất để đỡ phải bấm nhiều? Hãy đánh dấu sao `*` ngay trước đáp án đó.

*   **Viết là**: `[Trái/*Phải]`
*   **Hiển thị**: Ứng dụng sẽ tự chọn "Phải" ngay từ đầu.
*   **Quy tắc**: Nếu không đánh dấu `*`, ứng dụng sẽ tự chọn cái đầu tiên.

### Bài 3: Ẩn/Hiện nội dung (Công tắc)
Nếu trong ngoặc chỉ có **một** nội dung (không có dấu gạch chéo `/`), nó hoạt động như một công tắc Bật/Tắt.

*   **Viết là**: `[Kèm dính màng phổi]`
*   **Hiển thị**: Dòng chữ này sẽ hiện ra. Nếu bạn bấm vào nó, nó sẽ mờ đi (coi như không có).
*   **Mẹo**: Muốn nó ẩn ngay từ đầu? Thêm dấu sao `*` vào trước: `[*Kèm dính màng phổi]`.

### Bài 4: Điền một nơi, tự động cập nhật nhiều nơi (Biến số)
Hãy tưởng tượng bạn chọn "Phổi Trái" ở đầu trang, và muốn tất cả các đoạn văn bên dưới đều tự động hiểu là "Phổi Trái" mà không cần chọn lại. Đó là lúc dùng "Biến số" (ký hiệu là cặp dấu đô-la `$tên$`).

**Bước 1: Tạo bộ điều khiển (Định nghĩa)**
Thường đặt ở đầu văn bản. Bạn đặt tên cho nó (ví dụ `$Ben`) và đưa ra các lựa chọn.
*   **Viết là**: `[$Ben$=Trái/Phải]`

**Bước 2: Dùng ở mọi nơi**
Ở các đoạn văn bên dưới, chỗ nào cần điền chữ Trái/Phải, bạn chỉ cần gọi tên nó ra.
*   **Viết là**: `Đã cắt thùy phổi $Ben$.`
*   **Kết quả**: Khi bạn chọn "Trái" ở Bước 1, câu ở Bước 2 tự động thành "Đã cắt thùy phổi Trái".

### Tóm tắt nhanh
1.  **`[A/B]`**: Chọn A hoặc B (Mặc định là A).
2.  **`[*A/B]`**: Chọn sẵn A.
3.  **`[A]`**: Bấm để Ẩn/Hiện A.
4.  **`[$Ten$=A/B]`** và **`$Ten$`**: Chọn 1 lần, ăn theo cả bài.

---

## 3. Chi tiết Kỹ thuật về Cú pháp (Dành cho Admin/Dev)

Phần mềm sử dụng hệ thống "Bracket" để tạo ra các nội dung tương tác (lựa chọn, ẩn/hiện, biến số).

### 3.1. Lựa chọn Đa phương án (Multi-choice)

Sử dụng dấu gạch chéo `/` để phân cách các lựa chọn.

*   **Cú pháp**: `[Lựa chọn 1/Lựa chọn 2/Lựa chọn 3]`
*   **Mặc định**: Thêm dấu `*` trước hoặc sau lựa chọn để đặt làm mặc định. Nếu không có, lựa chọn đầu tiên sẽ là mặc định.
*   **Ví dụ**:
    *   `[Trái/Phải]` -> Mặc định là "Trái".
    *   `[Trái/*Phải]` -> Mặc định là "Phải".

> **Mẹo**: Nếu nội dung lựa chọn có chứa dấu `/`, hãy dùng `//` để thay thế. Ví dụ: `[1//2 ống/1 ống]` sẽ hiển thị lựa chọn là "1/2 ống" và "1 ống".

### 3.2. Ẩn/Hiện nội dung (Single-choice / Toggle)

Nếu chỉ có một cụm từ trong ngoặc, nó sẽ hoạt động như một nút bật/tắt (Hiện/Ẩn).

*   **Cú pháp**: `[Nội dung cần ẩn hiện]`
*   **Mặc định**:
    *   `[Nội dung]` -> Mặc định là **Hiện**.
    *   `[*Nội dung]` -> Mặc định là **Ẩn** (sẽ hiển thị dưới dạng `(ẩn) Nội dung` mờ đi).

### 3.3. Biến số (Variables)

Biến số giúp đồng bộ hóa các lựa chọn ở nhiều vị trí khác nhau trong văn bản.

#### Định nghĩa Biến
Định nghĩa biến bằng cách gán giá trị trong ngoặc vuông. Thường đặt ở đầu văn bản.

*   **Cú pháp**: `[$TênBiến$=Giá trị 1/Giá trị 2]`
*   **Ví dụ**: `[$Ben$=Trái/Phải]`
    *   Tạo ra một biến tên là `Ben` với 2 lựa chọn "Trái" và "Phải".

#### Sử dụng Biến
Chèn biến vào bất kỳ đâu trong văn bản. Khi người dùng thay đổi giá trị của biến ở nơi định nghĩa, tất cả các nơi sử dụng biến này sẽ tự động cập nhật theo.

*   **Cú pháp**: `$TênBiến$`
*   **Ví dụ**:
    *   Nội dung: `Phẫu thuật cắt thùy phổi [$Ben$=Trái/Phải]. Đặt dẫn lưu màng phổi bên $Ben$.`
    *   Kết quả: Khi chọn "Trái", văn bản sẽ là "Phẫu thuật cắt thùy phổi Trái. Đặt dẫn lưu màng phổi bên Trái."

### 3.4. Lồng ghép (Nesting)

Bạn có thể lồng các bracket vào nhau để tạo ra các lựa chọn phức tạp.

*   **Ví dụ**: `[Gây mê nội khí quản [2 nòng/1 nòng]/Mask thanh quản]`
    *   Nếu chọn "Gây mê nội khí quản", sẽ hiện thêm lựa chọn con là "2 nòng" hoặc "1 nòng".
    *   Nếu chọn "Mask thanh quản", lựa chọn con sẽ biến mất.

---

## 4. Quản lý Phiên bản (Versions)

Một protocol có thể có nhiều phiên bản nội dung (ví dụ: theo bác sĩ khác nhau, hoặc cập nhật mới).

*   **Cách tạo**: Thêm các cột `Nội dung 1`, `Nội dung 2`, `Nội dung 3`... trong file Excel.
*   **Đặt tên Version**: Để đặt tên riêng cho từng version (thay vì mặc định là Version 1, 2...), hãy thêm cú pháp `(#Tên Version)` vào bất kỳ đâu trong ô nội dung đó.
    *   **Ví dụ**: `(#BS. Hoài) Nội dung chi tiết...` -> Version này sẽ có tên là "BS. Hoài".

---

## 5. Hình ảnh và Điều kiện Hiển thị

Cột chứa hình ảnh **bắt buộc** phải có tên bắt đầu bằng chữ `Hình ảnh` (ví dụ: `Hình ảnh`, `Hình ảnh minh họa`, `Hình ảnh 1`...).

### Quy tắc chung
*   **Mỗi hàng là 1 hình**: Sử dụng `Alt + Enter` trong Excel để xuống dòng nếu muốn thêm nhiều hình.
*   **Thứ tự tự do**: Phần mềm tự động nhận diện đâu là Link ảnh, đâu là Điều kiện. Tuy nhiên, **cách viết tốt nhất** là:
    `[Điều kiện] Link_Ảnh Mô tả`
*   **Nguyên lý hiển thị**:
    *   Nếu **có** điều kiện: Ảnh chỉ hiện khi điều kiện đúng.
    *   Nếu **không** có điều kiện: Ảnh sẽ luôn hiện thị cho tất cả các trường hợp.

### Chi tiết thành phần
1.  **Link ảnh**:
    *   Phải là đường dẫn internet, bắt đầu bằng `http://` hoặc `https://`.
    *   Phải kết thúc bằng đuôi file ảnh hợp lệ (`.jpg`, `.png`, `.jpeg`, `.gif`, `.webp`...).
2.  **Điều kiện** (Tùy chọn):
    *   Cú pháp: `[$TênBiến$=Giá trị]`
    *   Ví dụ: `[$Ben$=Trái]` -> Ảnh chỉ hiện khi biến Ben là Trái.
3.  **Mô tả**:
    *   Là tất cả nội dung còn lại trong dòng (không phải link, không phải điều kiện).

### Ví dụ minh họa
*   `https://imgur.com/anh-chung.jpg Hình giải phẫu chung`
    -> Ảnh này luôn hiện.
*   `[$Ben$=Trái] https://imgur.com/anh-trai.jpg Tư thế nằm nghiêng sang phải`
    -> Ảnh này chỉ hiện khi người dùng chọn bên Trái.

---

## 6. Ví dụ Tổng hợp

Dưới đây là ví dụ mẫu cho một ô trong cột **Nội dung**:

```text
(#Cắt Kén Khí)
[$Ben$=Trái/Phải]
[$ViTri$=Đỉnh phổi/Thùy dưới]

1. Chuẩn bị bệnh nhân:
   - Tư thế: Nằm nghiêng sang [$Ben$=Trái?Phải:Trái].
   - Gây mê: [Nội khí quản 2 nòng/1 nòng].

2. Các bước tiến hành:
   - Vào ngực đường nách [giữa/trước] khoang liên sườn [4/5].
   - Quan sát thấy kén khí ở $ViTri$.
   - Tiến hành cắt kén khí bằng [Stapler/Dao siêu âm].
   - Kiểm tra rò khí: [Không rò/Có rò nhỏ (khâu tăng cường)].
   - Đặt dẫn lưu: [1 dẫn lưu/2 dẫn lưu] khoang màng phổi $Ben$.

3. Kết thúc:
   - Đóng ngực [theo lớp giải phẫu/bằng chỉ Vicryl].
```

**Giải thích:**
1.  **(#Cắt Kén Khí)**: Đặt tên cho version này là "Cắt Kén Khí".
2.  **[$Ben$=Trái/Phải]**: Định nghĩa biến `Ben`.
3.  **$ViTri$**: Định nghĩa biến `ViTri`.
4.  **[Nội khí quản 2 nòng/1 nòng]**: Lựa chọn đơn giản.
5.  **$Ben$**: Tự động điền giá trị "Trái" hoặc "Phải" tùy theo lựa chọn ở trên.

## 7. Đẩy (Push) Bản nháp lên Google Sheet qua Apps Script

Bạn có thể cấu hình ứng dụng để cho phép người dùng "Push" (đẩy) trực tiếp các phiên bản đã chỉnh sửa lên Google Sheet mà không cần mở file Excel.

### Bước 1: Lấy mã nguồn Apps Script
Bạn cần copy đoạn mã Google Apps Script.
Tìm file `scripts/AppScript.js` trong thư mục gốc của dự án hoặc liên hệ quản trị viên để lấy mã này.

### Bước 2: Tạo và Deploy Apps Script
1. Mở file Google Sheet của bạn.
2. Trên thanh menu, chọn **Tiện ích mở rộng > Apps Script** (Extensions > Apps Script).
3. Trong cửa sổ mới mở, dán toàn bộ đoạn mã bạn vừa copy vào (xóa đoạn mã `function myFunction() {}` mặc định đi).
4. Nhấn nút **Lưu dự án** (biểu tượng đĩa mềm).
5. Nhấn nút **Triển khai > Trình triển khai mới** (Deploy > New deployment).
6. Ở góc trên bên trái cửa sổ mới, nhấn biểu tượng bánh răng và chọn **Ứng dụng web** (Web app).
7. Điền thông tin:
   - Thêm mô tả: (Tùy chọn) Ví dụ "Push Protocol"
   - Thực thi với tư cách: **Tôi** (Me)
   - Người có quyền truy cập: **Bất kỳ ai** (Anyone)
8. Nhấn **Triển khai** (Deploy). *Lưu ý: Bạn có thể cần cấp quyền truy cập cho script.*
9. Sau khi triển khai thành công, copy **URL ứng dụng web** (Web app URL).

### Bước 3: Cấu hình trong ứng dụng
1. Quay lại giao diện phần mềm Protocol.
2. Mở phần **Cài đặt** (Settings) từ Menu (Góc trái > Tập tin > Cài đặt nguồn dữ liệu).
3. Dán **URL ứng dụng web** vừa copy vào ô **Google Apps Script URL** (nằm bên dưới Edit URL).
4. Lưu và đóng cài đặt.

Từ giờ, khi bạn chỉnh sửa một protocol, sẽ xuất hiện nút **Mũi tên lên (Push)** cạnh nút Reset. Nhấn vào đó để đẩy nội dung mới lên Google Sheet (bạn có thể chọn tạo cột mới hoặc ghi đè cột cũ).


## 8. Tips & Tricks

1.  **Escaping**: Nếu văn bản của bạn thực sự cần dấu `/` (ví dụ: "1/2"), hãy viết là `//` (ví dụ: `1//2`).
2.  **Xuống dòng**: Trong Excel, dùng `Alt + Enter` để xuống dòng. Phần mềm sẽ hiển thị đúng các dòng này.
3.  **In đậm**: Sử dụng `**từ cần in đậm**` để in đậm văn bản (Markdown style).
4.  **Sao chép công thức**: Nếu các protocol có cấu trúc giống nhau, hãy copy paste và chỉ sửa các phần trong ngoặc `[]`.
5.  **Kiểm tra lỗi**: Nếu thấy bracket không hoạt động (hiện nguyên văn bản gốc), hãy kiểm tra xem có thiếu dấu đóng `]` hoặc thừa khoảng trắng không mong muốn không.

---
*Tài liệu được tạo tự động bởi trợ lý AI Antigravity.*
