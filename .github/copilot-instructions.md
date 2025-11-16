# 🤖 Copilot Instructions for Thoracic Surgery Protocols Project

## Project Overview
Đây là dự án lấy dữ liệu từ một file **XLSX** (xuất từ Google Sheet) chứa các **quy trình phẫu thuật lồng ngực** và hiển thị dữ liệu đó ra giao diện web ở dạng có thể **copy (sao chép)** và **chỉnh sửa (edit)** trực tiếp.

---

## Architecture

* **Structure**: Protocol phẫu thuật lồng ngực được trích xuất từ file XLSX và sau đó được chuyển đổi/lưu trữ tạm thời dưới dạng **JSON object** (hoặc Markdown) trước khi được hiển thị bởi Vue.js.
* **Data Flow**: `Google Sheet/XLSX File` $\rightarrow$ `Service/Parser Module` $\rightarrow$ `Vue Component State` $\rightarrow$ `Editable UI`.
* **Source File**: Giả định file dữ liệu đầu vào là **`thoracic_protocols.xlsx`**.

---

## Key Patterns

* Tất cả hàm phải được tổ chức dạng **module** rõ ràng và có sự **liên kết (coupling)** chặt chẽ với nhau (ví dụ: `dataParser.js`, `apiService.js`, `protocolStore.js`).
* Sử dụng **Composition API** của Vue 3 cho các logic phức tạp.
* Đảm bảo tuân thủ nguyên tắc **Single Responsibility Principle (SRP)**.
* Dữ liệu thô (raw data) luôn được giữ **bất biến (immutable)**; mọi thao tác chỉnh sửa sẽ tạo ra một bản sao (copy) của dữ liệu.

---

## Workflows 🛠️

| Workflow | Mô tả | Lệnh/Hành động liên quan |
| :--- | :--- | :--- |
| **Parsing Data** | Đọc và chuyển đổi dữ liệu từ XLSX thành cấu trúc JSON có thể sử dụng. | `parseData(file)` |
| **Rendering Protocol**| Hiển thị dữ liệu protocol đã được parse dưới dạng bảng hoặc danh sách. | Tạo Component: `ProtocolDisplay.vue` |
| **Enabling Editing** | Thêm logic để người dùng có thể chỉnh sửa từng trường (field) của protocol. | Sử dụng `v-model` hoặc `onInput` trong Vue.js. |
| **Copying Data** | Triển khai nút/chức năng cho phép sao chép dữ liệu đã chỉnh sửa. | `copyToClipboard(data)` |

---

## Conventions 📝

* **Ngôn ngữ**: Toàn bộ **comments**, **variable names**, và **commit messages** phải được viết bằng **Tiếng Anh**.
* **Tên Component**: Dạng **PascalCase** (ví dụ: `ProtocolDisplay.vue`).
* **Tên Biến/Hàm**: Dạng **camelCase** (ví dụ: `protocolData`, `fetchProtocols`).
* **Styling**: Sử dụng **SCSS** (hoặc **Tailwind CSS** nếu dự án có) và tuân thủ **BEM** (Block-Element-Modifier) cho các class name.

---

## Integration Points

* **Data Source**: Module hoặc Service chịu trách nhiệm tải về và đọc file XLSX (ví dụ: `fetchXLSXData`).

* **State Management**: Sử dụng **Pinia** (hoặc `ref`/`reactive` đơn giản) để quản lý trạng thái protocol.

---

## Examples
* **Service Example**: Viết hàm trong `src/services/dataService.js` để parse dữ liệu.

---

## Dependencies

* **Frontend**: **Vue.js 3** (Sử dụng Composition API).
* **Data Parsing**: Cần sử dụng thư viện như **`xlsx`** (sheetjs) hoặc **`axios`** để gọi API nếu lấy dữ liệu trực tiếp từ Google Sheet.
* **Styling**: SCSS/CSS.

---

## Debugging 🐞

* Khi lỗi xảy ra, luôn **log (ghi nhật ký)** lỗi trong **Parser Module** trước.
* Kiểm tra **dữ liệu thô** (`raw data`) từ XLSX trước khi nó được parse.
* Kiểm tra **state** của component Vue bằng **Vue Devtools** để xác định lỗi hiển thị.

## Build & Deployment  🚀
* Sử dụng **Vite** hoặc **Vue CLI** để build project.
* Đảm bảo chạy lệnh `npm run build` để tạo bản build tối ưu trước khi triển khai.
* Build ra file tĩnh có thể deploy lên các dịch vụ hosting tĩnh như **Netlify**, **Vercel**, hoặc **GitHub Pages**.