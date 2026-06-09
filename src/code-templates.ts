// Complete PHP & SQL source code files for the university project.
// This allows the user to browse, copy, and understand the code.

export interface CodeFile {
  name: string;
  language: string;
  description: string;
  content: string;
}

export const codeTemplates: CodeFile[] = [
  {
    name: "db.sql",
    language: "sql",
    description: "Database structure and default seed locations. Run this in phpMyAdmin or MySQL terminal.",
    content: `-- --------------------------------------------------------
-- SQL Script for Smart Duty Check System
-- Database name: school_duty_db
-- --------------------------------------------------------

CREATE DATABASE IF NOT EXISTS \`school_duty_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`school_duty_db\`;

-- 1. Create 'teachers' table
-- Stores teacher credential information and roles.
CREATE TABLE IF NOT EXISTS \`teachers\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(100) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('teacher', 'admin') DEFAULT 'teacher'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Create 'duty_points' table
-- Stores Duty Locations with high-precision GPS coordinates & shift times.
CREATE TABLE IF NOT EXISTS \`duty_points\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(150) NOT NULL,
  \`latitude\` DECIMAL(10, 8) NOT NULL,
  \`longitude\` DECIMAL(11, 8) NOT NULL,
  \`start_time\` TIME NOT NULL,
  \`end_time\` TIME NOT NULL,
  \`allowed_radius_meters\` INT DEFAULT 50
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create 'checkins' table
-- Logs all duty check-in transactions validated by time and GPS distance.
CREATE TABLE IF NOT EXISTS \`checkins\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`teacher_id\` INT NOT NULL,
  \`point_id\` INT NOT NULL,
  \`image_path\` VARCHAR(255) NOT NULL,
  \`latitude\` DECIMAL(10, 8) NOT NULL,
  \`longitude\` DECIMAL(11, 8) NOT NULL,
  \`checkin_datetime\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`status\` ENUM('on-time', 'late', 'invalid_location') NOT NULL,
  FOREIGN KEY (\`teacher_id\`) REFERENCES \`teachers\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`point_id\`) REFERENCES \`duty_points\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Seeding Demo Data (University Project Sample Locations)
-- --------------------------------------------------------

-- Insert Demo Teachers & Admins
-- 'password123' is hashed using PHP's password_hash(..., PASSWORD_DEFAULT)
-- Wait! For local testing, we provide standard hashes of 'password123':
-- Hash of 'password123': $2y$10$C8YfHbyM.bY74CIdK243DuvhREoW.P1hX7E0lVqg.6oW2YmBv7c3C
INSERT INTO \`teachers\` (\`id\`, \`name\`, \`email\`, \`password\`, \`role\`) VALUES
(1, 'ครูสมชาย มีสุข', 'somchai@school.ac.th', '$2y$10$C8YfHbyM.bY74CIdK243DuvhREoW.P1hX7E0lVqg.6oW2YmBv7c3C', 'teacher'),
(2, 'ครูใจดี เรียนเก่ง', 'jaidee@school.ac.th', '$2y$10$C8YfHbyM.bY74CIdK243DuvhREoW.P1hX7E0lVqg.6oW2YmBv7c3C', 'teacher'),
(3, 'ผู้ดูแลระบบสูงสุด (Admin)', 'admin@school.ac.th', '$2y$10$C8YfHbyM.bY74CIdK243DuvhREoW.P1hX7E0lVqg.6oW2YmBv7c3C', 'admin');

-- Insert 6 Predefined School Duty Points (Using Bangkok Center coordinates for testing)
INSERT INTO \`duty_points\` (\`id\`, \`name\`, \`latitude\`, \`longitude\`, \`start_time\`, \`end_time\`, \`allowed_radius_meters\`) VALUES
(1, 'ประตูหน้าโรงเรียน', 13.75630000, 100.50180000, '07:00:00', '07:30:00', 50),
(2, 'กิจกรรมหน้าเสาธง', 13.75670000, 100.50220000, '07:30:00', '08:00:00', 50),
(3, 'อาคารเรียน 3', 13.75710000, 100.50250000, '08:00:00', '08:30:00', 50),
(4, 'อาคารเรียน 4', 13.75750000, 100.50290000, '08:00:00', '08:30:00', 50),
(5, 'ประตูทางเข้าโรงอาหาร', 13.75590000, 100.50120000, '07:00:00', '08:00:00', 50),
(6, 'บริเวณตรวจเช็คนักเรียนมาสาย', 13.75650000, 100.50190000, '07:30:00', '08:30:00', 50);
`
  },
  {
    name: "db.php",
    language: "php",
    description: "Database connection file using PDO (PHP Data Objects). Safe, modern, and injection-preventive.",
    content: `<?php
/**
 * db.php - Database connection setup using modern PDO
 * 
 * Why PDO?
 * 1. Supports prepared statements natively, preventing SQL Injection.
 * 2. Standardized interface across different RDBMS (MySQL, PostgreSQL, etc.).
 * 3. Robust Exception handling.
 */

$host = 'localhost';
$dbname = 'school_duty_db';
$username = 'root'; // Change to your production database user
$password = '';     // Change to your production database password
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays by default
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Use real prepared statements
];

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    // Hide sensitive server credentials from user, log raw message in error log
    error_log("Database connection failed: " . $e->getMessage());
    die("ขออภัย! ระบบขัดข้องกับการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง");
}
?>`
  },
  {
    name: "login.php",
    language: "php",
    description: "A secure PHP login page supporting both Teachers & Admins with Bootstrap 5 design.",
    content: `<?php
/**
 * login.php - Secure login system using PHP Sessions
 */
session_start();
require_once 'db.php';

// If already logged in, redirect straight to their respective view
if (isset($_SESSION['user_id'])) {
    if ($_SESSION['role'] === 'admin') {
        header("Location: dashboard_admin.php");
    } else {
        header("Location: dashboard_teacher.php");
    }
    exit;
}

$error_message = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'] ?? '';

    if (!empty($email) && !empty($password)) {
        try {
            // Prepared statement to find the user safety first!
            $stmt = $pdo->prepare("SELECT * FROM teachers WHERE email = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();

            // Verify password using secure password_verify tool
            if ($user && password_verify($password, $user['password'])) {
                // Set session tokens
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['name'];
                $_SESSION['role'] = $user['role'];

                // Redirect based on database role definition
                if ($user['role'] === 'admin') {
                    header("Location: dashboard_admin.php");
                } else {
                    header("Location: dashboard_teacher.php");
                }
                exit;
            } else {
                $error_message = "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
            }
        } catch (PDOException $e) {
            error_log("Login error: " . $e->getMessage());
            $error_message = "เกิดข้อผิดพลาดของระบบในระหว่างการเข้าสู่ระบบ";
        }
    } else {
        $error_message = "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน";
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เข้าสู่ระบบ - Smart Duty Check</title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f3f4f6;
            font-family: 'Sarabun', sans-serif;
        }
        .login-card {
            border: none;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
    </style>
</head>
<body class="d-flex align-items-center justify-content-center min-vh-100">

<div class="container" style="max-width: 420px;">
    <div class="text-center mb-4">
        <h4 class="fw-bold mb-1 col-primary">Smart Duty Check</h4>
        <p class="text-muted small">ระบบลงเวลาปฏิบัติงานครูเวรประจำวัน</p>
    </div>

    <div class="card login-card p-4">
        <h5 class="fw-semibold text-center mb-4">ยืนยันตัวตนคนทำงาน</h5>

        <?php if (!empty($error_message)): ?>
            <div class="alert alert-danger py-2 small" role="alert">
                <?= htmlspecialchars($error_message) ?>
            </div>
        <?php endif; ?>

        <form action="login.php" method="POST">
            <div class="mb-3">
                <label for="email" class="form-label text-muted small fw-medium">อีเมลสถาบัน</label>
                <input type="email" class="form-control" id="email" name="email" 
                       placeholder="example@school.ac.th" required value="<?= htmlspecialchars($email ?? '') ?>">
            </div>
            
            <div class="mb-4">
                <label for="password" class="form-label text-muted small fw-medium">รหัสผ่าน</label>
                <input type="password" class="form-control" id="password" name="password" 
                       placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn btn-primary w-full py-2.5 fw-semibold rounded-lg shadow-sm">
                เข้าสู่ระบบใช้งาน
            </button>
        </form>

        <div class="mt-4 pt-3 border-top text-center">
            <p class="text-muted small mb-1">บัญชีทดลองระบบ (Demo Accounts):</p>
            <div class="text-xs text-start bg-light p-2 rounded border font-monospace">
                <strong>ครู:</strong> somchai@school.ac.th / password123<br>
                <strong>แอดมิน:</strong> admin@school.ac.th / password123
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`
  },
  {
    name: "dashboard_teacher.php",
    language: "php",
    description: "Teacher's dashboard showing duties for today, dynamic status checks, and the trigger to check in.",
    content: `<?php
/**
 * dashboard_teacher.php - Dashboard view specifically for Teachers
 */
session_start();
require_once 'db.php';

// Force authentication as a teacher
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    header("Location: login.php");
    exit;
}

$teacher_id = $_SESSION['user_id'];
$teacher_name = $_SESSION['user_name'];

// Fetch all duty points to display
try {
    $stmt = $pdo->query("SELECT * FROM duty_points ORDER BY start_time ASC");
    $duty_points = $stmt->fetchAll();
    
    // Fetch today's check-ins for this teacher
    $stmt_checkin = $pdo->prepare("
        SELECT c.*, d.name as point_name 
        FROM checkins c 
        JOIN duty_points d ON c.point_id = d.id 
        WHERE c.teacher_id = :teacher_id AND DATE(c.checkin_datetime) = CURRENT_DATE()
    ");
    $stmt_checkin->execute(['teacher_id' => $teacher_id]);
    $my_checkins = $stmt_checkin->fetchAll();
    
    // Map check-ins for easy access helper
    $checked_points = [];
    foreach ($my_checkins as $c_record) {
        $checked_points[$c_record['point_id']] = $c_record;
    }
} catch (PDOException $e) {
    die("Error fetching duty schedule: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แดชบอร์ดครูเวร - Smart Duty Check</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet font-sans">
    <style>
        body { background-color: #f8f9fa; font-family: sans-serif; }
        .duty-card { border-radius: 12px; border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.04); transition: transform 0.2s; }
        .duty-card:hover { transform: translateY(-2px); }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="#">Smart Duty System</a>
        <div class="d-flex align-items-center">
            <span class="text-white-50 me-3 d-none d-md-inline">โดย <?= htmlspecialchars($teacher_name) ?></span>
            <a href="logout.php" class="btn btn-outline-light btn-sm">ออกจากระบบ</a>
        </div>
    </div>
</nav>

<div class="container my-4">
    <div class="row mb-4">
        <div class="col">
            <h2 class="fw-bold text-dark">จุดปฏิบัติงานของฉันวันนี้</h2>
            <p class="text-muted">กรุณาไปยังจุด และตอกบัตรภายในกำหนดเวลาด้วย GPS และหน้ากล้องมือถือ</p>
        </div>
    </div>

    <div class="row g-3">
        <?php foreach ($duty_points as $dp): 
            $has_checked = isset($checked_points[$dp['id']]);
            $status_data = $has_checked ? $checked_points[$dp['id']] : null;
        ?>
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 duty-card p-3 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-secondary">จุดเวรที่ <?= htmlspecialchars($dp['id']) ?></span>
                            <?php if ($has_checked): ?>
                                <?php if ($status_data['status'] === 'on-time'): ?>
                                    <span class="badge bg-success">ตรงเวลา (On Time)</span>
                                <?php elseif ($status_data['status'] === 'late'): ?>
                                    <span class="badge bg-warning text-dark font-sans">สาย (Late)</span>
                                <?php else: ?>
                                    <span class="badge bg-danger">นอกพิกัด (Invalid Location)</span>
                                <?php endif; ?>
                            <?php else: ?>
                                <span class="badge bg-light text-dark border">รอลงชื่อ</span>
                            <?php endif; ?>
                        </div>
                        <h5 class="fw-bold mb-1 text-dark"><?= htmlspecialchars($dp['name']) ?></h5>
                        <p class="text-muted small mb-3">ช่วงเวลา: <strong><?= date("H:i", strtotime($dp['start_time'])) ?> - <?= date("H:i", strtotime($dp['end_time'])) ?> น.</strong></p>
                        
                        <div class="small bg-light p-2 rounded mb-3 border">
                            <i class="bi bi-geo-alt-fill text-danger"></i> พิกัดระบุ: <?= $dp['latitude'] ?>, <?= $dp['longitude'] ?><br>
                            <span class="text-muted">ระยะรัศมีจำกัด: <?= $dp['allowed_radius_meters'] ?> เมตร</span>
                        </div>
                    </div>

                    <div>
                        <?php if ($has_checked): ?>
                            <button class="btn btn-emerald w-100 disabled" disabled>✔ ลงเวลาแล้วเมื่อ <?= date("H:i", strtotime($status_data['checkin_datetime'])) ?> น.</button>
                        <?php else: ?>
                            <a href="checkin.php?point_id=<?= $dp['id'] ?>" class="btn btn-primary w-100 fw-bold">
                                📷 ไปหน้าตรวจสอบลงเวลา
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

</body>
</html>`
  },
  {
    name: "checkin.php",
    language: "php",
    description: "The teacher's check-in interface. Requests camera permissions, captures a canvas image, reads high-precision HTML5 GPS coordinates, and triggers an AJAX fetch.",
    content: `<?php
/**
 * checkin.php - Frontend Web Camera and GPS Capture Engine
 */
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    header("Location: login.php");
    exit;
}

$point_id = filter_input(INPUT_GET, 'point_id', FILTER_VALIDATE_INT);
if (!$point_id) {
    die("ไม่ได้ระบุจุดลงชื่อทดสอบที่ถูกต้อง");
}

// Fetch target checkpoint credentials/positions
try {
    $stmt = $pdo->prepare("SELECT * FROM duty_points WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $point_id]);
    $point = $stmt->fetch();
    if (!$point) {
        die("ไม่พบข้อมูลจุดลงเวลานี้ในระบบ");
    }
} catch (PDOException $e) {
    die("Database failure: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ลงชื่อตอกบัตร - Smart Duty Check</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet font-sans">
    <style>
        body { background-color: #f3f4f6; }
        .camera-box {
            position: relative;
            background: #000;
            border-radius: 16px;
            overflow: hidden;
            aspect-ratio: 4/3;
            max-width: 480px;
            margin: 0 auto;
        }
        #video { width: 100%; height: 100%; object-fit: cover; }
        #canvas { display: none; }
        .camera-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.6);
            color: #fff;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
        }
    </style>
</head>
<body class="py-4">

<div class="container shadow-lg bg-white p-3 rounded" style="max-width: 540px;">
    <div class="mb-3">
        <a href="dashboard_teacher.php" class="text-secondary small text-decoration-none">← กลับไปที่หลักสไลด์หน้าที่แล้ว</a>
    </div>

    <div class="text-center mb-3">
        <span class="badge bg-info mb-1">จุดตรวจสอบยืนยัน</span>
        <h4 class="fw-bold mb-1"><?= htmlspecialchars($point['name']) ?></h4>
        <p class="text-muted small">กรุณาหันกล้องถ่ายเซลฟี่ และเปิด GPS ระบายระยะ</p>
    </div>

    <!-- camera feed segment -->
    <div class="camera-box mb-3">
        <video id="video" autoplay playsinline muted></video>
        <canvas id="canvas" width="640" height="480"></canvas>
        <div class="camera-overlay">ระบบตรวจสอบกล้องบันทึกสด</div>
    </div>

    <!-- Live diagnostic tracker -->
    <div class="card p-3 mb-3 bg-light border">
        <h6 class="fw-bold small mb-2 text-dark"><i class="bi bi-geo-alt"></i> สถานะเซ็นเซอร์อุปกรณ์ของคุณ</h6>
        <div class="row g-2 text-xs">
            <div class="col-6">
                <strong>พิกัดละติจูด (Lat):</strong> <span id="lbl-lat" class="text-muted">กำลังค้นพิกัด...</span>
            </div>
            <div class="col-6">
                <strong>ลองจิจูด (Lng):</strong> <span id="lbl-lon" class="text-muted">กำลังค้นพิกัด...</span>
            </div>
            <div class="col-12 border-top pt-1 mt-1">
                <strong>ความคลาดเคลื่อน GPS:</strong> ±<span id="lbl-acc">0</span> เมตร
            </div>
        </div>
    </div>

    <button id="btn-submit" class="btn btn-success w-100 py-3 fw-bold rounded-pill text-lg shadow-sm" disabled>
        📷 ถ่ายรูปภาพพร้อมเช็คอินลงชื่อด้วยพิกัด
    </button>

    <div id="response-msg" class="mt-3"></div>
</div>

<script>
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const btnSubmit = document.getElementById('btn-submit');
const lblLat = document.getElementById('lbl-lat');
const lblLon = document.getElementById('lbl-lon');
const lblAcc = document.getElementById('lbl-acc');
const responseMsg = document.getElementById('response-msg');

let currentLat = null;
let currentLon = null;

// Page Initializer: Grab camera feed AND continuous geo-location coordinates
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize web camera
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }, // Front-facing camera for authentic self-verification
            audio: false
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera fail: ", err);
        alert("ไม่สามารถเข้าถึงกล้องหน้าได้ ระบบจำเป็นต้องใช้ภาพท่านในการตรวจสอบจุดเช็คอิน");
    }

    // 2. Fetch HTML5 Geolocation positions
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => {
                currentLat = pos.coords.latitude;
                currentLon = pos.coords.longitude;
                lblLat.innerText = currentLat.toFixed(6);
                lblLon.innerText = currentLon.toFixed(6);
                lblAcc.innerText = pos.coords.accuracy.toFixed(1);
                
                // Allow user checkin activation once coordinate data streams successfully
                btnSubmit.disabled = false;
            },
            (err) => {
                console.error("Location lookup failure: ", err);
                alert("สิทธิ์พิกัดแผนที่ถูกปิดกั้น กรุณาเปิดแอป GPS ด้วยเบราว์เซอร์");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("อุปกรณ์ของคุณไม่รองรับบริการค้นหาพิกัด Geolocation");
    }
});

// Capture Canvas Snap + Post data asynchronously to processor script
btnSubmit.addEventListener('click', () => {
    if (!currentLat || !currentLon) {
        alert("ระบบค้นหาดาวเทียม GPS ของท่านไม่สมบูรณ์ ไม่สามารถลงเวลาได้");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = "⏳ กำลังส่งข้อมูลเซ็กเคียวตรวจสอบ...";

    // Context frame drawing
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to target high-quality Base64 Image
    const dataURL = canvas.toDataURL('image/jpeg');

    // Build Form field payload
    const formData = new FormData();
    formData.append('point_id', <?= $point_id ?>);
    formData.append('image', dataURL);
    formData.append('latitude', currentLat);
    formData.append('longitude', currentLon);

    // Fetch call
    fetch('process_checkin.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            responseMsg.innerHTML = \`<div class="alert alert-success fw-bold text-center">\${data.message}<br>นำคุณกลับใน 2 วินาที...</div>\`;
            setTimeout(() => {
                window.location.href = "dashboard_teacher.php";
            }, 2000);
        } else {
            responseMsg.innerHTML = \`<div class="alert alert-danger fw-bold text-center">\${data.message}</div>\`;
            btnSubmit.disabled = false;
            btnSubmit.innerText = "📷 ถ่ายรูปภาพพร้อมเช็คอินลงชื่อด้วยพิกัด";
        }
    })
    .catch(err => {
        console.error(err);
        alert("การโอนถ่ายสัญญาณล้มเหลว ลองใหม่อีกรอบ");
        btnSubmit.disabled = false;
        btnSubmit.innerText = "📷 ถ่ายรูปภาพพร้อมเช็คอินลงชื่อด้วยพิกัด";
    });
});
</script>
</body>
</html>`
  },
  {
    name: "process_checkin.php",
    language: "php",
    description: "The backend business logic. Decodes Base64 data, calculates distance using the Haversine formula, verifies current time window, logs transaction, and returns dynamic status in JSON format.",
    content: `<?php
/**
 * process_checkin.php - Secure AJAX entry point of checkin transactions
 * Calculates proximity limits with High Accuracy mathematical formulas
 */
header('Content-Type: application/json');
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(['status' => 'error', 'message' => 'ไม่มีสิทธิ์เข้าถึงเซสชัน']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid Request Method']);
    exit;
}

$point_id = filter_input(INPUT_POST, 'point_id', FILTER_VALIDATE_INT);
$raw_image = $_POST['image'] ?? '';
$teacher_lat = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
$teacher_lon = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);

if (!$point_id || empty($raw_image) || !$teacher_lat || !$teacher_lon) {
    echo json_encode(['status' => 'error', 'message' => 'ข้อมูลตรวจสอบไม่ครบถ้วน']);
    exit;
}

// 1. Haversine distance calculator - High Accuracy Great Circle Formula
// Calculates precise distance over the Earth's curvature.
function calculateDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadiusInMeters = 6371000; // Mean radius of Earth (6371 km)

    // Convert degrees to radians
    $latFrom = deg2rad($lat1);
    $lonFrom = deg2rad($lon1);
    $latTo = deg2rad($lat2);
    $lonTo = deg2rad($lon2);

    $latDelta = $latTo - $latFrom;
    $lonDelta = $lonTo - $lonFrom;

    $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
          cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
          
    return $angle * $earthRadiusInMeters; // Distance in meters
}

try {
    // 2. Fetch predefined duty points constraints
    $stmt = $pdo->prepare("SELECT * FROM duty_points WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $point_id]);
    $point = $stmt->fetch();

    if (!$point) {
        echo json_encode(['status' => 'error', 'message' => 'ไม่พบข้อมูลโครงการเวรนี้']);
        exit;
    }

    // 3. Compute Distance Proximity
    $distance = calculateDistance($teacher_lat, $teacher_lon, $point['latitude'], $point['longitude']);
    $within_radius = ($distance <= $point['allowed_radius_meters']);

    // 4. Time Shift Checks
    $currentTime = date('H:i:s');
    $startTime = $point['start_time'];
    $endTime = $point['end_time'];

    // Determine target check-in state
    $final_status = 'invalid_location';

    if (!$within_radius) {
        // Teacher not in the designated workspace bounds
        $final_status = 'invalid_location';
        $message = "เช็คอินล้มเหลว! ท่านอยู่นอกพิกัดจุดปฏิบัติงาน (ระยะห่างปัจจุบัน " . round($distance, 1) . " ม. ซึ่งไกลกว่า " . $point['allowed_radius_meters'] . " ม.)";
        echo json_encode(['status' => 'error', 'message' => $message]);
        exit;
    } else {
        // Logged coordinates are legally within approved geo-radius
        if ($currentTime <= $endTime) {
            // Checkin completed successfully either before start_time (on-time) or late but during
            if ($currentTime < $startTime) {
                // Extremely early checking helper
                $final_status = 'on-time';
                $message = "ลงชื่อสำเร็จตรงเวลาก่อนกำหนด (ตรงเวลา)";
            } else {
                $final_status = 'on-time';
                $message = "ลงชื่อเช็คอินตรงเวลาเรียบร้อย (ระยะห่าง " . round($distance, 1) . " เมตร)";
            }
        } else {
            // Checked in safely after shift closed hours
            $final_status = 'late';
            $message = "ลงชื่อเรียบร้อย แต่ล่าช้ากว่ากำหนด (สถานะ: ล่าช้า)";
        }
    }

    // 5. Decode Base64 Image string & store in /uploads folder
    // Format is typically data:image/jpeg;base64,.....
    $image_parts = explode(";base64,", $raw_image);
    $image_base64 = base64_decode($image_parts[1]);

    // Create unique identifier name
    $file_name = "chekin_" . $user_id . "_" . time() . ".jpg";
    $upload_dir = 'uploads/';
    
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    $full_path = $upload_dir . $file_name;
    file_put_contents($full_path, $image_base64);

    // 6. DB Transaction Commit Log
    $insert_stmt = $pdo->prepare("
        INSERT INTO checkins (teacher_id, point_id, image_path, latitude, longitude, status, checkin_datetime) 
        VALUES (:teacher_id, :point_id, :image_path, :latitude, :longitude, :status, NOW())
    ");
    $insert_stmt->execute([
        'teacher_id' => $user_id,
        'point_id'   => $point_id,
        'image_path' => $full_path,
        'latitude'   => $teacher_lat,
        'longitude'  => $teacher_lon,
        'status'     => $final_status
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => $message
    ]);

} catch (Exception $e) {
    error_log("Checkin processing issue: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาดในการประมวลผลเซิร์ฟเวอร์']);
}
?>`
  },
  {
    name: "dashboard_admin.php",
    language: "php",
    description: "Secure, structured administrator cockpit to observe, verify, filter, and export the status reports of the daily school duty tasks.",
    content: `<?php
/**
 * dashboard_admin.php - Secure administrative analytical and evaluation panel
 */
session_start();
require_once 'db.php';

// Auth checks
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

$admin_name = $_SESSION['user_name'];

try {
    // Collect all duty logs registered to dates
    $stmt = $pdo->query("
        SELECT c.*, t.name as teacher_name, t.email as teacher_email, d.name as point_name, d.start_time, d.end_time
        FROM checkins c
        JOIN teachers t ON c.teacher_id = t.id
        JOIN duty_points d ON c.point_id = d.id
        ORDER BY c.checkin_datetime DESC
    ");
    $logs = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Database transaction fault: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ผู้ดูแลระบบ แดชบอร์ดตรวจสอบ - Smart Duty Check</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet font-sans">
    <style>
        body { background-color: #f4f6f9; }
        .table-responsive { background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .thumbnail-img { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; cursor: pointer; transition: 0.1s; border: 1px solid #ccc; }
        .thumbnail-img:hover { transform: scale(1.1); }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container">
        <a class="navbar-brand fw-bold" href="#">Smart Duty System (Admin Control)</a>
        <div class="d-flex align-items-center">
            <span class="text-white-50 me-3">ผู้ดูแล: <?= htmlspecialchars($admin_name) ?></span>
            <a href="logout.php" class="btn btn-outline-light btn-sm">ออกจากระบบ</a>
        </div>
    </div>
</nav>

<div class="container my-4">
    <div class="row align-items-center mb-4">
        <div class="col-md-8">
            <h2 class="fw-bold text-dark">บันทึกการรายงานตัวจุดครูเวร</h2>
            <p class="text-muted">ตรวจสอบตอกชื่อ ตรวจเช็คภาพใบหน้าสด และเซ็นเซอร์ GPS ยืนยันแบบเรียลไทม์</p>
        </div>
        <div class="col-md-4 text-md-end">
            <button onclick="window.print()" class="btn btn-primary">🖨 พิมพ์บันทึกการปฏิบัติงานวันนี้</button>
        </div>
    </div>

    <!-- Data logs table layout -->
    <div class="table-responsive p-3 border">
        <table class="table table-hover align-middle mb-0 text-sm">
            <thead class="table-dark">
                <tr>
                    <th>รูปภาพเซลฟี่</th>
                    <th>ครูผู้อยู่เวร</th>
                    <th>จุดรายงานปฏิบัติเวร</th>
                    <th>เวลาตอกเวร</th>
                    <th>พิกัดส่งเข้าแผนที่</th>
                    <th>ผลตอบรับการรับรอง</th>
                </tr>
            </thead>
            <tbody>
                <?php if (count($logs) === 0): ?>
                    <tr>
                        <td colspan="6" class="text-center text-muted py-5 font-sans">ยังไม่มีการเช็คอินลงชื่อเข้าระบบในวันนี้</td>
                    </tr>
                <?php endif; ?>
                <?php foreach ($logs as $log): ?>
                    <tr>
                        <td>
                            <a href="<?= htmlspecialchars($log['image_path']) ?>" target="_blank">
                                <img src="<?= htmlspecialchars($log['image_path']) ?>" class="thumbnail-img" alt="Face Verification">
                            </a>
                        </td>
                        <td>
                            <div class="fw-bold text-dark"><?= htmlspecialchars($log['teacher_name']) ?></div>
                            <div class="text-xs text-muted"><?= htmlspecialchars($log['teacher_email']) ?></div>
                        </td>
                        <td>
                            <div class="fw-semibold"><?= htmlspecialchars($log['point_name']) ?></div>
                            <div class="text-xs text-secondary">เวรปกติ: <?= date("H:i", strtotime($log['start_time'])) ?> - <?= date("H:i", strtotime($log['end_time'])) ?> น.</div>
                        </td>
                        <td>
                            <div class="badge bg-light text-dark shadow-sm">
                                <?= date("d/m/Y - H:i:s", strtotime($log['checkin_datetime'])) ?>
                            </div>
                        </td>
                        <td>
                            <div class="small fw-mono">
                                Lat: <?= $log['latitude'] ?><br>
                                Lon: <?= $log['longitude'] ?>
                            </div>
                            <a href="https://www.google.com/maps/search/?api=1&query=<?= $log['latitude'] ?>,<?= $log['longitude'] ?>" 
                               target="_blank" class="text-xs text-decoration-none">
                                🗺 ตรวจแผนที่กูเกิล (View Map)
                            </a>
                        </td>
                        <td>
                            <?php if ($log['status'] === 'on-time'): ?>
                                <span class="badge bg-success py-2 px-3">✔ ตรงเวลา (On Time)</span>
                            <?php elseif ($log['status'] === 'late'): ?>
                                <span class="badge bg-warning text-dark py-2 px-3">⏰ ล่าช้า (Late Checkin)</span>
                            <?php else : ?>
                                <span class="badge bg-danger py-2 px-3">❌ นอกเขต (Invalid Spot)</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

</body>
</html>`
  },
  {
    name: "logout.php",
    language: "php",
    description: "Clean script to clear university sessions and safely redirect to login.php.",
    content: `<?php
/**
 * logout.php - Destroys the current secure PHP user session.
 */
session_start();
$_SESSION = array();

// If it's desired to kill the session cookie, destroy it too
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();
header("Location: login.php");
exit;
?>`
  }
];
