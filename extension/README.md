# Tiện ích trình duyệt EmbedFix

Tiện ích Manifest V3 dành cho Google Chrome và Microsoft Edge. Mọi URL mạng xã hội được chuyển đổi ngay trên thiết bị, không cần backend hoặc gửi yêu cầu mạng.

## Cài đặt cục bộ

### Google Chrome

1. Mở `chrome://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn thư mục `extension` này.
5. Ghim EmbedFix lên thanh công cụ nếu cần.

### Microsoft Edge

1. Mở `edge://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn thư mục `extension` này.

## Sử dụng

- Nhấn biểu tượng trên thanh công cụ để tự động chuyển đổi tab hiện tại.
- Dán, nhập hoặc kéo thả URL khác vào popup.
- Nhấp chuột phải vào trang hoặc liên kết, sau đó chọn **Sao chép URL nhúng tối ưu** hoặc **Mở URL nhúng tối ưu**.
- Nhấn `Ctrl+Shift+C` (`Command+Shift+C` trên macOS) để sao chép URL đã chuyển đổi của tab hiện tại.
- Mở popup để sao chép, mở, chia sẻ hoặc tạo mã QR.

Nếu phím tắt bị trùng với tiện ích khác, hãy đổi tại `chrome://extensions/shortcuts` hoặc `edge://extensions/shortcuts`.

## Quyền sử dụng

| Permission | Purpose |
| --- | --- |
| `activeTab` | Đọc URL tab hiện tại sau khi người dùng mở hoặc gọi EmbedFix. |
| `storage` | Lưu giao diện và 20 lần chuyển đổi gần nhất trên thiết bị. |
| `contextMenus` | Thêm thao tác chuyển đổi vào menu chuột phải của trang và liên kết. |
| `offscreen` | Thực hiện thao tác clipboard được yêu cầu từ menu hoặc phím tắt. |
| `clipboardWrite` | Sao chép URL đã chuyển đổi vào clipboard. |

Tiện ích không khai báo host permissions và không đọc nội dung trang.

## Cấu trúc

```text
extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── service-worker.js
├── offscreen.html
├── offscreen.js
├── core/
│   └── converter.js
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── vendor/
    ├── qrcode.min.js
    └── LICENSE-qrcodejs.txt
```

## Tuân thủ Manifest V3

- Toàn bộ JavaScript thực thi được đóng gói cục bộ.
- Không dùng remote script, inline script hoặc `eval()`.
- QRCode.js được đóng gói kèm giấy phép thay vì tải từ CDN.
- Không cần backend hoặc host permissions.

## Đóng gói phát hành

Nén nội dung thư mục `extension` sao cho `manifest.json` nằm tại gốc file ZIP. Có thể gửi cùng một gói lên Chrome Web Store và Microsoft Edge Add-ons.

Trước khi phát hành, hãy cập nhật `version` trong `manifest.json`, chuẩn bị ảnh chụp và hoàn thành khai báo quyền riêng tư trên từng cửa hàng.
