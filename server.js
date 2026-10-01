const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ================= DATABASE LƯU TRỮ VĨNH VIỄN CHỐNG MẤT DỮ LIỆU =================
const DATA_FILE = path.join(__dirname, 'users_database.json');
let dbData = { users: {} };

if (fs.existsSync(DATA_FILE)) {
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        if (content.trim().length > 0) dbData = JSON.parse(content);
    } catch (e) {
        dbData = { users: {} };
    }
}
if (!dbData.users) dbData.users = {};

function saveUsersToDisk() {
    try { 
        fs.writeFileSync(DATA_FILE, JSON.stringify(dbData, null, 2), 'utf8'); 
    } catch(e) {}
}

// ================= HƯỚNG DẪN CẤU HÌNH TỶ LỆ TRÚNG VÒNG QUAY MAY MẮN (%) =================
// Bạn thích ô nào ra nhiều hay ít thì chỉ cần chỉnh lại số ở mục "tyLe".
// Mẹo bắt buộc: Tổng số phần trăm của cả 4 ô cộng lại phải vừa đúng bằng 100!
let phanThuongVongQuay = [
    { index: 0, ten: "Nick Sơ Cấp", loai: "acc", tk: "clone_sc_01", mk: "pass123", note: "Nick sơ cấp sẵn cần vàng", tyLe: 50 }, // Tỷ lệ ra: 50%
    { index: 1, ten: "Chúc May Mắn", loai: "text", msg: "Bạn đã trúng phần quà may mắn lượt sau!", tyLe: 30 },             // Tỷ lệ ra: 30%
    { index: 2, ten: "Nick Trung Cấp", loai: "acc", tk: "trung_cap_02", mk: "pass456", note: "Nick trung cấp full pet", tyLe: 15 }, // Tỷ lệ ra: 15%
    { index: 3, ten: "Siêu Siêu VIP", loai: "acc", tk: "sieuvip9999", mk: "adminptg", note: "SIÊU PHẨM: Biệt thự, cánh hiếm full rương!", tyLe: 5 } // Tỷ lệ ra: 5%
];

function generateRandomUID() { 
    return Math.floor(100000 + Math.random() * 900000).toString(); 
}

// ================= HỆ THỐNG ĐƯỜNG TRUYỀN API ROUTER SHOP =================
app.post('/api/auth/gmail-login', (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.json({ success: false, msg: "Gmail không hợp lệ" });
    const cleanEmail = email.toLowerCase().trim();

    if (!dbData.users[cleanEmail]) {
        dbData.users[cleanEmail] = { uid: generateRandomUID(), email: cleanEmail, balance: 0, avatar: 'https://imgur.com', history: [] };
        saveUsersToDisk();
    }
    return res.json({ success: true, user: dbData.users[cleanEmail] });
});

app.post('/api/user/nap-tien', (req, res) => {
    const { email } = req.body;
    const user = dbData.users[(email || '').toLowerCase().trim()];
    if (!user) return res.status(400).json({ error: "Chưa đăng nhập" });
    return res.json({ success: true, uid: user.uid });
});

app.post('/api/shop/quay-vong-quay', (req, res) => {
    const { email } = req.body;
    const user = dbData.users[(email || '').toLowerCase().trim()];
    const giaQuay = 20000; // Giá tiền 1 lượt quay

    if (!user) return res.json({ success: false, msg: "Vui lòng nhập định dạng Gmail trước!" });
    
    // NẾU KHÁCH KHÔNG ĐỦ TIỀN ➔ BÁO ĐÚNG THÔNG BÁO THEO YÊU CẦU CỦA BẠN
    if (!user.balance || user.balance < giaQuay || user.balance <= 0) {
        return res.json({ success: false, msg: `Số dư không đủ vui lòng liên hệ sđt 0907859891 bank tiền + UID: ${user.uid} để được cộng tiền vào tài khoản` });
    }

    // Thuật toán chạy tỷ lệ % xác suất chính xác
    let xacSuat = Math.floor(Math.random() * 100) + 1; 
    let mocDuoi = 0;
    let phanThuongTrung = phanThuongVongQuay; 

    for (let i = 0; i < phanThuongVongQuay.length; i++) {
        let mocTren = mocDuoi + phanThuongVongQuay[i].tyLe;
        if (xacSuat > mocDuoi && xacSuat <= mocTren) { phanThuongTrung = phanThuongVongQuay[i]; break; }
        mocDuoi = mocTren;
    }

    user.balance -= giaQuay;
    let textKetQua = phanThuongTrung.loai === 'acc' ? `Trúng ${phanThuongTrung.ten} -> TK: ${phanThuongTrung.tk} | MK: ${phanThuongTrung.mk} (${phanThuongTrung.note})` : `Trúng ô: ${phanThuongTrung.ten}`;
    
    user.history.unshift({ thoiGian: new Date().toLocaleString('vi-VN'), tenSp: "Vòng Quay May Mắn 20K", ketQua: textKetQua });
    saveUsersToDisk();

    return res.json({ success: true, reward: phanThuongTrung, newBalance: user.balance, history: user.history });
});

// Giao diện admin bí mật nạp tiền cho khách theo UID ngẫu nhiên
app.get('/panel-admin-an', (req, res) => {
    res.send(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Cộng Tiền Chủ Shop</title></head>
        <body style="font-family:Arial; background:#2c3e50; color:white; text-align:center; padding:20px;">
            <div style="background:#34495e; padding:25px; border-radius:15px; display:inline-block; max-width:400px; width:100%; text-align:left; margin-top:40px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                <h2 style="text-align:center; color:#f1c40f;">⚙️ PANEL CỘNG TIỀN KHÁCH</h2>
                <label><b>Nhập Mã Số Khách Gửi (UID):</b></label><input type="text" id="uid" placeholder="Ví dụ: 582491" style="width:100%; padding:12px; margin:10px 0; font-size:16px; border-radius:8px; border:none; background:#0f172a; color:white;"><br>
                <label><b>Số Tiền Cộng Thêm (đ):</b></label><input type="number" id="amount" style="width:100%; padding:12px; margin:10px 0; font-size:16px; border-radius:8px; border:none; background:#0f172a; color:white;"><br>
                <button onclick="addMoney()" style="background:#2ecc71; color:white; padding:14px; width:100%; border:none; border-radius:8px; font-weight:bold; font-size:16px; cursor:pointer;">XÁC NHẬN CỘNG TIỀN</button>
            </div>
            <script>
                function addMoney() {
                    const uid = document.getElementById('uid').value.trim(); const amount = document.getElementById('amount').value;
                    if(!uid || !amount) return alert("Vui lòng điền đủ thông tin!");
                    fetch('/api/admin/add-money', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ uid, amount: parseInt(amount) }) })
                    .then(res => res.json()).then(data => { alert(data.success ? "Cộng tiền thành công!" : "Lỗi: " + data.msg); });
                }
            </script>
        </body></html>
    `);
});

app.post('/api/admin/add-money', (req, res) => {
    const { uid, amount } = req.body;
    let foundUser = null;
    for (let email in dbData.users) { if (dbData.users[email].uid === (uid || '').toString().trim()) { foundUser = dbData.users[email]; break; } }
    if (!foundUser) return res.json({ success: false, msg: "Không tìm thấy mã số khách!" });
    foundUser.balance += amount;
    saveUsersToDisk();
    return res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hệ thống đang chạy mượt mà tại cổng: ${PORT}`));
