# Hướng dẫn cài đặt và chạy dự án DSS

Tài liệu hướng dẫn chạy **Germany Multi-Hazard DSS** trên Windows bằng PowerShell. Các lệnh bên dưới sử dụng thư mục hiện tại `C:\Users\DELL\Desktop\DSS`; nếu lưu dự án ở nơi khác, hãy thay đường dẫn tương ứng.

## 1. Thành phần và yêu cầu

- **Backend:** Python và Flask, cung cấp API và xử lý dữ liệu raster GIS.
- **Frontend:** HTML, CSS, JavaScript tĩnh, không cần Node.js hoặc `npm install`.
- **Python:** dự án yêu cầu Python 3.11 trở lên; có thể dùng Python 3.12 64-bit cho các bước bên dưới.
- **Trình duyệt:** Edge, Chrome hoặc Firefox.
- **Internet:** cần khi tải thư viện Python, tải Leaflet từ CDN và hiển thị bản đồ nền OpenStreetMap.

Nếu chưa cài Python, cài Python 3.12 64-bit và chọn **Add python.exe to PATH** trong trình cài đặt. Mở lại PowerShell sau khi cài, rồi kiểm tra:

```powershell
python --version
python -m pip --version
```

Nếu `python` không được nhận diện nhưng có Python Launcher, dùng `py -3.12` thay cho `python` khi tạo môi trường ảo ở bước tiếp theo.

## 2. Cài đặt thư viện backend (lần đầu)

Mở PowerShell và chạy lần lượt:

```powershell
cd "C:\Users\DELL\Desktop\DSS\backend"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Các lệnh gọi trực tiếp Python trong `.venv`, nên **không cần kích hoạt môi trường ảo** hoặc thay đổi chính sách chạy script của PowerShell.

Các thư viện đã được khai báo trong `backend/requirements.txt`:

| Thư viện | Phiên bản | Công dụng |
| --- | --- | --- |
| Flask | 3.1.2 | Chạy máy chủ API |
| flask-cors | 6.0.1 | Cho phép frontend gọi API từ cổng khác |
| numpy | 2.3.3 | Tính toán trên mảng dữ liệu raster |
| rasterio | 1.4.3 | Đọc GeoTIFF và xử lý lưới raster |
| Pillow | 11.3.0 | Xuất ảnh PNG kết quả |

Kiểm tra việc cài đặt:

```powershell
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -c "import flask, flask_cors, numpy, rasterio; from PIL import Image; print('Cai dat thu vien thanh cong')"
```

## 3. Chuẩn bị dữ liệu GIS

Đặt các file GeoTIFF vào thư mục `backend/data/germany/source/` với đúng tên:

| Tên file | Dữ liệu |
| --- | --- |
| `closure.tif` | Đóng cửa hoạt động khai thác mỏ |
| `typeofmining_raster.tif` | Loại hình khai thác mỏ |
| `Aquifer_raster.tif` | Sự hiện diện của tầng chứa nước trong lớp phủ |
| `coalseam_raster.tif` | Vỉa than nông |
| `lithologie_raster.tif` | Địa chất lớp phủ |

Backend tự tạo thư mục nguồn khi chạy `app.py` nếu thư mục chưa tồn tại. Giữ các file phụ trợ đi kèm như `.tfw`, `.aux.xml`, `.cpg`, `.dbf` nếu có.

Có thể mở giao diện và kiểm tra API khi chưa có dữ liệu. Để tính toán, phải có file tương ứng với tất cả yếu tố đã chọn; không bắt buộc chọn đủ cả năm yếu tố.

Các raster được chọn phải có cùng hệ tọa độ (CRS) đã xác định và có vùng giao nhau. Mã hiện tại đưa chúng về lưới chung trong bộ nhớ bằng nội suy láng giềng gần nhất; không tự chấp nhận các raster khác CRS. Cần kiểm tra giá trị pixel, NoData và ý nghĩa các lớp dữ liệu trước khi sử dụng kết quả. Tham khảo thêm `backend/data/README.md` về dữ liệu nguồn.

## 4. Chạy backend — cửa sổ PowerShell thứ nhất

```powershell
cd "C:\Users\DELL\Desktop\DSS\backend"
.\.venv\Scripts\python.exe app.py
```

Giữ cửa sổ này mở. Backend chạy tại `http://127.0.0.1:5000`.

Mở địa chỉ sau trong trình duyệt để kiểm tra:

```text
http://127.0.0.1:5000/api/health
```

Kết quả mong đợi là JSON có `status` bằng `ok` và `phase` bằng `2`.

## 5. Chạy frontend — cửa sổ PowerShell thứ hai

```powershell
cd "C:\Users\DELL\Desktop\DSS\frontend"
..\backend\.venv\Scripts\python.exe -m http.server 5500 --bind 127.0.0.1
```

Giữ cửa sổ này mở và truy cập:

```text
http://127.0.0.1:5500
```

Frontend hiện gọi API tại `http://127.0.0.1:5000/api`, được khai báo bằng biến `API` trong `frontend/app.js`. Dự án hiện không cần cấu hình file `.env` hay cơ sở dữ liệu để chạy.

## 6. Sử dụng giao diện

1. Chọn **Public Access**.
2. Nhấn điểm **Germany** trên bản đồ.
3. Chọn từ **2 đến 5** yếu tố có dữ liệu raster.
4. Chọn mức tương tác `I_i` cho từng yếu tố: thấp (`1`), trung bình (`2`) hoặc cao (`3`).
5. Nhấn nút tính toán để xem kết quả trên bản đồ.

Chỉ số thô được tính theo `SHI = sum(H_i * N_i * I_i)`. Ảnh kết quả được lưu tại `backend/data/germany/results/shi-<mã>.png`; thư mục kết quả được tạo khi tính toán.

**Giới hạn hiện tại:** mã đang chia mức 1–9 theo các khoảng bằng nhau của giá trị tối đa lý thuyết. Đây là cách phân lớp tạm thời, chưa phải ngưỡng khoa học chính thức.

## 7. Chạy lại và dừng dự án

Những lần sau chỉ cần thực hiện lại **bước 4 và bước 5**, không cần tạo lại `.venv`. Chạy lại lệnh cài từ `requirements.txt` nếu file thư viện thay đổi hoặc môi trường ảo được tạo mới.

Để dừng, nhấn `Ctrl+C` trong từng cửa sổ PowerShell đang chạy máy chủ.

## 8. Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không tìm thấy `python` hoặc mở Microsoft Store | Kiểm tra cài đặt Python và PATH, mở lại PowerShell; nếu có Launcher, dùng `py -3.12 -m venv .venv`. |
| Không tìm thấy `.venv\Scripts\python.exe` | Kiểm tra đang ở đúng thư mục và đã tạo môi trường ảo tại `backend/.venv`. |
| `ModuleNotFoundError` | Chạy lại bước cài thư viện bằng `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` trong thư mục `backend`. |
| PowerShell chặn `Activate.ps1` | Dùng trực tiếp các lệnh trong tài liệu; chúng không cần chạy `Activate.ps1`. |
| Cài Rasterio/NumPy báo lỗi build hoặc không tìm thấy bản phù hợp | Kiểm tra phiên bản và kiến trúc Python. Dùng Python 3.12 64-bit, tạo môi trường ảo mới bằng phiên bản đó và nâng cấp pip trước khi cài lại. |
| `Failed to fetch` hoặc thông báo backend không khả dụng | Kiểm tra cửa sổ backend còn chạy và truy cập `/api/health` tại cổng 5000. |
| Cổng 5500 đang được sử dụng | Chạy frontend với cổng khác, ví dụ `..\backend\.venv\Scripts\python.exe -m http.server 5501 --bind 127.0.0.1`, rồi mở `http://127.0.0.1:5501`. |
| Cổng 5000 đang được sử dụng | Dừng phiên backend cũ nếu đó là tiến trình của bạn. Nếu đổi `port=5000` trong `backend/app.py`, phải đổi cổng trong biến `API` của `frontend/app.js` cho khớp và khởi động lại backend. |
| `Required Germany rasters are missing` (HTTP 422) | Bổ sung đúng các file được báo thiếu vào `backend/data/germany/source/`. |
| Lỗi CRS hoặc raster không giao nhau (HTTP 422) | Kiểm tra hệ tọa độ và phạm vi dữ liệu GIS; chuẩn hóa các raster về cùng CRS trước khi tính. |
| Không thấy bản đồ nền hoặc có lỗi `L is not defined` | Kiểm tra kết nối Internet và việc trình duyệt tải Leaflet từ CDN cùng ảnh bản đồ OpenStreetMap. |

Các lệnh trên dùng máy chủ phát triển cục bộ. `backend/app.py` hiện bật `debug=True`.
