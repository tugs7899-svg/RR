import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, MapPin, Clock, Database, Code, UserCheck, User, Lock, LogOut, 
  AlertTriangle, CheckCircle2, Map, Settings, Search, FileText, Sliders, 
  Sparkles, ArrowLeft, Copy, Check, Info, HelpCircle, 
  ShieldCheck, Eye, Smartphone, Plus, Trash2, UserPlus
} from "lucide-react";
import { codeTemplates } from "./code-templates";

// -------------------------------------------------------------
// Interfaces for State management in Simulator
// -------------------------------------------------------------
interface Teacher {
  id: number;
  name: string;
  email: string;
  role: "teacher" | "admin";
}

interface DutyPoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  allowed_radius_meters: number;
}

interface CheckInRecord {
  id: number;
  teacher_id: number;
  teacher_name: string;
  teacher_email: string;
  point_id: number;
  point_name: string;
  image_path: string;
  latitude: number;
  longitude: number;
  checkin_datetime: string;
  status: "on-time" | "late" | "invalid_location";
  distance_meters: number;
}

// Predefined school coordinates (Bangkok - Kasetsart University area center)
const BANGKOK_CENTER = { lat: 13.756300, lng: 100.501800 };

// Seed Duty Points
const DEFAULT_DUTY_POINTS: DutyPoint[] = [
  { id: 1, name: "ประตูหน้าโรงเรียน", latitude: 13.756300, longitude: 100.501800, start_time: "07:00", end_time: "07:30", allowed_radius_meters: 50 },
  { id: 2, name: "กิจกรรมหน้าเสาธง", latitude: 13.756700, longitude: 100.502200, start_time: "07:30", end_time: "08:00", allowed_radius_meters: 50 },
  { id: 3, name: "อาคารเรียน 3", latitude: 13.757100, longitude: 100.502500, start_time: "08:00", end_time: "08:30", allowed_radius_meters: 50 },
  { id: 4, name: "อาคารเรียน 4", latitude: 13.757500, longitude: 100.502900, start_time: "08:00", end_time: "08:30", allowed_radius_meters: 50 },
  { id: 5, name: "ประตูทางเข้าโรงอาหาร", latitude: 13.755900, longitude: 100.501200, start_time: "07:00", end_time: "08:00", allowed_radius_meters: 50 },
  { id: 6, name: "บริเวณตรวจเช็คนักเรียนมาสาย", latitude: 13.756500, longitude: 100.501900, start_time: "07:30", end_time: "08:30", allowed_radius_meters: 50 }
];

// High-precision Haversine distance calculator - matches PHP code
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Mean Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export default function App() {
  // -------------------------------------------------------------
  // Global State
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<"simulator" | "code_hub">("simulator");
  const [selectedFile, setSelectedFile] = useState<string>("db.sql");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Simulation parameters (control panel Desk)
  const [simTime, setSimTime] = useState<string>("07:22"); // Default simulated time
  // Current simulated latitude/longitude (offset from gate point #1 by default)
  const [simLat, setSimLat] = useState<number>(13.756300);
  const [simLng, setSimLng] = useState<number>(100.501800);
  const [gpsPreset, setGpsPreset] = useState<string>("exact-gate");
  const [cameraMode, setCameraMode] = useState<"simulated" | "real">("simulated");

  // Authentication State
  const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
  const [emailInput, setEmailInput] = useState<string>("somchai@school.ac.th");
  const [passwordInput, setPasswordInput] = useState<string>("password123");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Mock Database State (Syncs to localStorage for persistent simulator runs)
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem("mock_school_teachers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading teachers from localStorage", e);
      }
    }
    return [
      { id: 1, name: "ครูสมชาย มีสุข", email: "somchai@school.ac.th", role: "teacher" },
      { id: 2, name: "ครูใจดี เรียนเก่ง", email: "jaidee@school.ac.th", role: "teacher" },
      { id: 3, name: "ผู้ดูแลระบบสูงสุด (Admin)", email: "admin@school.ac.th", role: "admin" }
    ];
  });

  const saveTeachers = (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    localStorage.setItem("mock_school_teachers", JSON.stringify(newTeachers));
  };

  // State for Admin sub-sections & teacher enrollment
  const [adminSubTab, setAdminSubTab] = useState<"logs" | "teachers">("logs");
  const [newTeacherName, setNewTeacherName] = useState<string>("");
  const [newTeacherEmail, setNewTeacherEmail] = useState<string>("");
  const [newTeacherRole, setNewTeacherRole] = useState<"teacher" | "admin">("teacher");
  const [addTeacherSuccess, setAddTeacherSuccess] = useState<string | null>(null);
  const [addTeacherError, setAddTeacherError] = useState<string | null>(null);
  const [selectedReportTeacher, setSelectedReportTeacher] = useState<Teacher | null>(null);
  
  const [dutyPoints] = useState<DutyPoint[]>(DEFAULT_DUTY_POINTS);
  const [checkins, setCheckins] = useState<CheckInRecord[]>([]);

  // UI state inside dashboard
  const [activeScreen, setActiveScreen] = useState<"dashboard" | "checkin">("dashboard");
  const [selectedPoint, setSelectedPoint] = useState<DutyPoint | null>(null);
  const [checkinMessage, setCheckinMessage] = useState<{ status: "success" | "error"; text: string; details?: string } | null>(null);
  const [showPhotoModalUrl, setShowPhotoModalUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Real Camera hook states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [realCameraStream, setLocalStream] = useState<MediaStream | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Boot & Initialization
  // -------------------------------------------------------------
  useEffect(() => {
    // Load existing items from localStorage if available
    const savedCheckins = localStorage.getItem("mock_school_checkins");
    if (savedCheckins) {
      setCheckins(JSON.parse(savedCheckins));
    } else {
      // Mock initial demo logs to fill the admin page beautifully on first boot
      const initialLogs: CheckInRecord[] = [
        {
          id: 101,
          teacher_id: 2,
          teacher_name: "ครูใจดี เรียนเก่ง",
          teacher_email: "jaidee@school.ac.th",
          point_id: 1,
          point_name: "ประตูหน้าโรงเรียน",
          image_path: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250&h=250",
          latitude: 13.756280,
          longitude: 100.501815,
          checkin_datetime: "2026-06-09 07:12:45",
          status: "on-time",
          distance_meters: 3.2
        },
        {
          id: 102,
          teacher_id: 1,
          teacher_name: "ครูสมชาย มีสุข",
          teacher_email: "somchai@school.ac.th",
          point_id: 5,
          point_name: "ประตูทางเข้าโรงอาหาร",
          image_path: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250&h=250",
          latitude: 13.755880,
          longitude: 100.501180,
          checkin_datetime: "2026-06-09 07:44:12",
          status: "on-time",
          distance_meters: 4.8
        },
        {
          id: 103,
          teacher_id: 2,
          teacher_name: "ครูใจดี เรียนเก่ง",
          teacher_email: "jaidee@school.ac.th",
          point_id: 2,
          point_name: "กิจกรรมหน้าเสาธง",
          image_path: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250&h=250",
          latitude: 13.756680,
          longitude: 100.502220,
          checkin_datetime: "2026-06-09 08:05:30",
          status: "late",
          distance_meters: 3.5
        }
      ];
      setCheckins(initialLogs);
      localStorage.setItem("mock_school_checkins", JSON.stringify(initialLogs));
    }
  }, []);

  // Sync checkins to local storage whenever they change
  const saveCheckins = (newCheckins: CheckInRecord[]) => {
    setCheckins(newCheckins);
    localStorage.setItem("mock_school_checkins", JSON.stringify(newCheckins));
  };

  // Preset location handler
  const handlePresetChange = (preset: string) => {
    setGpsPreset(preset);
    switch (preset) {
      case "exact-gate":
        // gatepoint #1 center
        setSimLat(13.756300);
        setSimLng(100.501800);
        break;
      case "near-gate":
        // 18 meters from gate point #1
        setSimLat(13.756180);
        setSimLng(100.501900);
        break;
      case "far-gate":
        // 145 meters from gatepoint (invalid location)
        setSimLat(13.757400);
        setSimLng(100.502400);
        break;
      case "flagstaff":
        // Matching flagstaff point #2
        setSimLat(13.756700);
        setSimLng(100.502200);
        break;
      case "canteen":
        // canteen #5
        setSimLat(13.755900);
        setSimLng(100.501200);
        break;
    }
  };

  // Real coordinate synchronization hook
  const syncWithRealDeviceGps = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSimLat(position.coords.latitude);
          setSimLng(position.coords.longitude);
          setGpsPreset("real-device");
          setGeolocationError(null);
        },
        () => {
          setGeolocationError("ไม่สามารถเข้าถึงพิกัดอุปกรณ์จริงได้ กรุณาอนุมัติสิทธิ์ และเปิด GPS");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setGeolocationError("เบราว์เซอร์นี้ไม่รองรับ Geolocation API");
    }
  };

  // Real Camera video thread initialization
  useEffect(() => {
    if (cameraMode === "real" && activeScreen === "checkin" && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then((stream) => {
          setLocalStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera error:", err);
          alert("ไม่สามารถเข้าถึงกล้องถ่ายภาพจริงได้ กำลังสลับไปใช้ระบบกล้องจำลอง (Simulated Camera)");
          setCameraMode("simulated");
        });
    }

    return () => {
      if (realCameraStream) {
        realCameraStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    };
  }, [cameraMode, activeScreen]);

  // Copy code helper
  const handleCopyCode = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    setCopyFeedback(name);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Clear database logs
  const handleClearLogs = () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะล้างบันทึกการเช็คอินทั้งหมดในตัวจำลองเว็บ?")) {
      saveCheckins([]);
    }
  };

  // -------------------------------------------------------------
  // Authentication Actions
  // -------------------------------------------------------------
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = teachers.find(t => t.email.toLowerCase() === emailInput.trim().toLowerCase());
    if (user && passwordInput === "password123") {
      setCurrentUser(user);
      setLoginError(null);
      setActiveScreen("dashboard");
      setCheckinMessage(null);
    } else {
      setLoginError("อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านทดสอบคือ password123)");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScreen("dashboard");
    setCheckinMessage(null);
  };

  // -------------------------------------------------------------
  // Teacher Management Actions (Admin)
  // -------------------------------------------------------------
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setAddTeacherError(null);
    setAddTeacherSuccess(null);

    const name = newTeacherName.trim();
    const email = newTeacherEmail.trim().toLowerCase();

    if (!name || !email) {
      setAddTeacherError("กรุณากรอกข้อมูลชื่อและอีเมลให้ครบทุกช่อง");
      return;
    }

    // Email address formatting check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAddTeacherError("รูปแบบอีเมลไม่เหมาะสม ตัวอย่าง: somying@school.ac.th");
      return;
    }

    // Duplicate check
    if (teachers.some(t => t.email.toLowerCase() === email)) {
      setAddTeacherError(`อีเมล '${email}' มีอยู่ในระบบแล้ว`);
      return;
    }

    const nextId = teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1;
    const newTeacher: Teacher = {
      id: nextId,
      name,
      email,
      role: newTeacherRole
    };

    const updated = [...teachers, newTeacher];
    saveTeachers(updated);

    setAddTeacherSuccess(`เพิ่มและลงทะเบียน "${name}" เป็น ${newTeacherRole === 'admin' ? 'ผู้บริหารสูงสุด (Admin)' : 'คุณครูผู้เวร (Teacher)'} แล้วเสร็จ! ล็อกอินด้วยอีเมลนี้และรหัสผ่าน password123`);
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherRole("teacher");
  };

  const handleDeleteTeacher = (idToDelete: number) => {
    if (currentUser && idToDelete === currentUser.id) {
      alert("ไม่สามารถลบสิทธิ์บัญชีของตนเองที่ยังคงปฏิบัติงานครอบคลุมเซสชั่นปัจจุบันอยู่ได้!");
      return;
    }

    const target = teachers.find(t => t.id === idToDelete);
    if (!target) return;

    if (confirm(`คุณต้องการยกเลิกและเพิกถอนสิทธิ์ระบบของ "${target.name}" ใช่หรือไม่?`)) {
      const updated = teachers.filter(t => t.id !== idToDelete);
      saveTeachers(updated);
    }
  };

  // -------------------------------------------------------------
  // Check-In Simulation Action
  // -------------------------------------------------------------
  const triggerCheckinProcess = () => {
    if (!selectedPoint || !currentUser) return;

    // Calculate proximity using Haversine formula
    const distanceMeters = calculateHaversineDistance(simLat, simLng, selectedPoint.latitude, selectedPoint.longitude);
    const isWithinRadius = distanceMeters <= selectedPoint.allowed_radius_meters;

    // Parse time restrictions
    const [simH, simM] = simTime.split(":").map(Number);
    const [startH, startM] = selectedPoint.start_time.split(":").map(Number);
    const [endH, endM] = selectedPoint.end_time.split(":").map(Number);

    const checkinMinutes = simH * 60 + simM;
    const endMinutes = endH * 60 + endM;

    let computedStatus: "on-time" | "late" | "invalid_location" = "invalid_location";
    let text = "";
    let details = "";

    const mathFormula = `Haversine:\nΔlat = ${Math.abs(simLat - selectedPoint.latitude).toFixed(6)} rad\nΔlon = ${Math.abs(simLng - selectedPoint.longitude).toFixed(6)} rad\nระยะห่างคำนวณทางดาราศาสตร์ = ${distanceMeters.toFixed(1)} เมตร`;

    if (!isWithinRadius) {
      computedStatus = "invalid_location";
      text = `เช็คอินล้มเหลว! ท่านอยู่นอกพิกัดจุดปฏิบัติงาน ${selectedPoint.name}`;
      details = `ระยะห่างจากเป้าหมายคือ ${distanceMeters.toFixed(1)} เมตร เกินกว่าที่เงื่อนไขระบุสูงสุด ${selectedPoint.allowed_radius_meters} เมตร \n\n${mathFormula}`;
    } else {
      if (checkinMinutes <= endMinutes) {
        computedStatus = "on-time";
        text = `เช็คอินเรียบร้อย ตรงเวลา! ณ ${selectedPoint.name}`;
        details = `พิกัดสมบูรณ์ (ระยะห่าง ${distanceMeters.toFixed(1)} ม. เป็นไปตามค่ารักษาความคลาดเคลื่อน ${selectedPoint.allowed_radius_meters} ม.) ลงทะเบียนด้วยเวลาจำลอง ${simTime} น. สำเร็จ\n\n${mathFormula}`;
      } else {
        computedStatus = "late";
        text = `เช็คอินเรียบร้อย แต่สายช้ากว่ากำหนด! ณ ${selectedPoint.name}`;
        details = `พิกัดผ่านการตรวจสอบเขต (ระยะห่าง ${distanceMeters.toFixed(1)} ม.) แต่ทำเวลาช้ากว่ากำหนดการ ${selectedPoint.end_time} น. ระบบล็อกพฤติกรรมสาย\n\n${mathFormula}`;
      }
    }

    let finalImg = "";
    if (cameraMode === "real" && canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        finalImg = canvas.toDataURL("image/jpeg");
      }
    } else {
      const faceID = currentUser.id === 1 ? "1506794778202-cad84cf45f1d" : "1544005313-94ddf0286df2";
      finalImg = `https://images.unsplash.com/photo-${faceID}?auto=format&fit=crop&q=80&w=250&h=250`;
    }

    const newLog: CheckInRecord = {
      id: Date.now(),
      teacher_id: currentUser.id,
      teacher_name: currentUser.name,
      teacher_email: currentUser.email,
      point_id: selectedPoint.id,
      point_name: selectedPoint.name,
      image_path: finalImg,
      latitude: Number(simLat.toFixed(6)),
      longitude: Number(simLng.toFixed(6)),
      checkin_datetime: `2026-06-09 ${simTime}:00`,
      status: computedStatus,
      distance_meters: Number(distanceMeters.toFixed(1))
    };

    const newLogs = [newLog, ...checkins];
    saveCheckins(newLogs);

    setCheckinMessage({
      status: computedStatus === "invalid_location" ? "error" : "success",
      text,
      details
    });
  };

  const filteredLogs = checkins.filter(log => {
    const matchesSearch = log.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.point_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div id="app_root" className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white print:hidden">
      
      {/* -------------------------------------------------------------
          Header Bar with elegant typography
          ------------------------------------------------------------- */}
      <header id="app_header" className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 py-4 shadow-sm shadow-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-905 font-sans">Smart Duty Check System</h1>
                <span className="text-[10px] px-2.5 py-0.5 bg-indigo-600 text-white rounded-full font-semibold">
                  University Final Project
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">ระบบลงเวลาจุดตรวจครูเวรจำลองพิกัดแนวรัศมีอัจฉริยะ (GPS & Camera)</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/60 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "simulator" 
                  ? "bg-white text-indigo-700 shadow-sm" 
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-650" />
              จำลองระบบสด (Sandbox App)
            </button>
            <button 
              onClick={() => setActiveTab("code_hub")}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "code_hub" 
                  ? "bg-white text-indigo-700 shadow-sm" 
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-indigo-650" />
              โครงสร้างต้นฉบับ (PHP & MySQL Codes)
            </button>
          </div>

        </div>
      </header>

      {/* -------------------------------------------------------------
          TAB 1: LIVE SIMULATOR PLATFORM
          ------------------------------------------------------------- */}
      {activeTab === "simulator" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL (8 cols): The dynamic Simulated Phone Screen & Operations */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shadow-slate-100">
              
              {/* App Layout Header */}
              <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    หน้าต่างแอปพลิเคชันมือถือ (Simulated Mobile Container)
                  </span>
                </div>
                {currentUser ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-700 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      👤 {currentUser.name} ({currentUser.role === 'admin' ? 'ผู้บริหารเวร' : 'คุณครู'})
                    </span>
                    <button 
                      onClick={handleLogout}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="ออกจากระบบ"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">ยังไม่เข้าใช้งาน</span>
                )}
              </div>

              {/* Core App View switcher */}
              <div className="p-6 bg-slate-50/50 min-h-[500px] flex flex-col justify-center">

                {/* LOGIN PANEL (If not authenticated) */}
                {!currentUser && (
                  <div className="max-w-md w-full mx-auto bg-white border border-slate-200 p-6 rounded-3xl shadow-lg shadow-slate-100">
                    <div className="text-center mb-6">
                      <div className="inline-flex p-3 bg-indigo-50 border border-indigo-100 rounded-full mb-3 text-indigo-600">
                        <Smartphone className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">Smart Duty Check</h3>
                      <p className="text-xs text-slate-500 font-medium font-sans">ลงชื่อระบบครูเวรประจำวัน มหาวิทยาลัย/โรงเรียน</p>
                    </div>

                    {loginError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-650 text-xs p-3.5 rounded-2xl mb-4 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">อีเมลผู้ใช้งาน</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <User className="w-4 h-4" />
                          </span>
                          <input 
                            type="email"
                            required
                            placeholder="somchai@school.ac.th"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">รหัสผ่าน</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input 
                            type="password"
                            required
                            placeholder="password123"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-indigo-100"
                      >
                        เข้าสู่ระบบใช้งาน (Login)
                      </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-250">
                      <p className="text-xs text-slate-500 text-center mb-3 font-medium font-sans">บัญชีทดสอบระบบสำเร็จรูป คลิกเพื่อกรอกรวดเร็ว:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {teachers.map((teacher) => (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() => {
                              setEmailInput(teacher.email);
                              setPasswordInput("password123");
                            }}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-2.5 text-left transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <span className={`text-[9px] font-bold font-mono uppercase ${
                              teacher.role === 'admin' ? 'text-emerald-650' : 'text-indigo-650'
                            }`}>
                              {teacher.role === 'admin' ? 'ผู้ดูแล (Admin)' : 'ครูเวร (Teacher)'}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{teacher.name}</span>
                            <span className="text-[9px] font-mono text-slate-450 truncate block">{teacher.email}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* APP VIEW A: TEACHER DISPATCH BOARD */}
                {currentUser && currentUser.role === "teacher" && activeScreen === "dashboard" && (
                  <div className="w-full max-w-3xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <div>
                        <h4 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-indigo-650" />จุดปฏิบัติงานครูเวรวันนี้
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">กรุณาเข้าใกล้รัศมี 50 เมตรและถ่ายภาพเซลฟี่ยืนยัน</p>
                      </div>
                      <div className="text-xs flex items-center gap-1.5 font-mono text-indigo-650 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-105">
                        <Clock className="w-3.5 h-3.5" />
                        เวลาจำลองปัจจุบัน: <span className="font-bold text-indigo-600">{simTime} น.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dutyPoints.map((dp) => {
                        const checkin = checkins.find(c => c.point_id === dp.id && c.teacher_id === currentUser.id);
                        const distance = calculateHaversineDistance(simLat, simLng, dp.latitude, dp.longitude);
                        const isInside = distance <= dp.allowed_radius_meters;

                        return (
                          <div 
                            key={dp.id}
                            className="bg-white border border-slate-250 hover:border-indigo-305 rounded-3xl p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-sm shadow-slate-102 group"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                  จุดที่ {dp.id}
                                </span>
                                {checkin ? (
                                  <span className={`text-[10px] px-2.5 py-1 font-bold rounded-full flex items-center gap-1 ${
                                    checkin.status === 'on-time' 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                      : checkin.status === 'late'
                                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                                  }`}>
                                    {checkin.status === 'on-time' && "✔ ตรงเวลา"}
                                    {checkin.status === 'late' && "⏰ สาย"}
                                    {checkin.status === 'invalid_location' && "❌ นอกพิกัด"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2.5 py-1 font-bold rounded-full bg-slate-100 text-slate-550 border border-slate-200/60">
                                    ยังไม่รายงานตัว
                                  </span>
                                )}
                              </div>

                              <h5 className="text-md font-black text-slate-900 mb-1 font-sans">{dp.name}</h5>
                              
                              <p className="text-xs text-slate-500 flex items-center gap-1 mb-3 font-medium">
                                <Clock className="w-3.5 h-3.5 text-indigo-650" />
                                ปฏิบัติงาน: <span className="text-slate-800 font-bold">{dp.start_time} - {dp.end_time} น.</span>
                              </p>

                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-[11px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">เป้าหมาย:</span>
                                  <span className="text-slate-700 font-bold font-mono">{dp.latitude.toFixed(5)}, {dp.longitude.toFixed(5)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200/60 pt-1.5 mt-1.5 font-sans">
                                  <span className="text-slate-500">ระยะห่างคำนวณ:</span>
                                  <span className={`font-mono font-black ${isInside ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {distance > 1000 ? `${(distance/1000).toFixed(2)} กม.` : `${distance.toFixed(1)} เมตร`}
                                  </span>
                                </div>
                                <div className="flex justify-between font-sans">
                                  <span className="text-slate-500">สถานะพิกัด:</span>
                                  <span className={`font-bold ${isInside ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {isInside ? "✔ อยู่ในพื้นที่ (≤50ม.)" : "⚠ นอกพื้นที่เช็คอิน"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 pt-1">
                              {checkin ? (
                                <button className="w-full bg-emerald-50 text-emerald-600 border border-emerald-250 py-2.5 rounded-2xl text-xs font-bold cursor-not-allowed">
                                  รายงานตัวเสร็จเมื่อ {checkin.checkin_datetime.split(" ")[1]} น.
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setSelectedPoint(dp);
                                    setActiveScreen("checkin");
                                    setCheckinMessage(null);
                                  }}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  ยืนยันตัวตนตอกบัตรที่จุดนี้
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* APP VIEW B: CAMERA & GPS CHECKIN INTERFACE */}
                {currentUser && currentUser.role === "teacher" && activeScreen === "checkin" && selectedPoint && (
                  <div className="max-w-md w-full mx-auto bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm shadow-slate-100">
                    
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <button 
                        onClick={() => {
                          setActiveScreen("dashboard");
                          setCheckinMessage(null);
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-50 hover:bg-slate-110 px-3 py-1.5 rounded-xl border border-slate-200 transition-all font-semibold cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-500" /> ย้อนกลับ
                      </button>
                      <span className="text-xs font-bold text-indigo-650 truncate max-w-[150px] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                        จุดลงเวลา: {selectedPoint.name}
                      </span>
                    </div>

                    {!checkinMessage ? (
                      <>
                        <div className="text-center">
                          <span className="text-[10px] px-2.5 py-1 bg-indigo-50 text-indigo-600 font-sans font-bold border border-indigo-100 rounded-lg">
                            STEP 1: SELFIE & GEOTRACT VERIFICATION
                          </span>
                          <h4 className="text-sm font-black text-slate-800 mt-2 font-sans">ยืนยันตัวตนปฏิบัติหน้าที่ครูเวร</h4>
                          <p className="text-[11px] text-slate-500 font-medium">กรุณาจัดวางใบหน้ากึ่งกลางกล้องและตรวจสอบหน่วย GPS ด้านล่าง</p>
                        </div>

                        {/* Interactive Simulated Camera Lens Viewport */}
                        <div className="relative aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                          {cameraMode === "real" ? (
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 relative p-4">
                              
                              {/* Glowing scanner target lines */}
                              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl"></div>
                              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr"></div>
                              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl"></div>
                              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br"></div>

                              {/* Face node graphic */}
                              <div className="relative w-28 h-28 bg-indigo-500/5 rounded-full border border-indigo-500/20 flex items-center justify-center mb-2 animate-pulse">
                                <User className="w-14 h-14 text-indigo-400/80" />
                                <div className="absolute inset-2 border border-dashed border-indigo-400/30 rounded-full animate-spin-slow"></div>
                              </div>

                              <span className="text-xs font-semibold text-indigo-400 font-mono tracking-wider uppercase animate-pulse">
                                [ simulated camera feed active ]
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1 max-w-[200px] text-center">
                                ถ่ายแบบทดลองดึงภาพจากระบบอัตโนมัติ
                              </span>
                            </div>
                          )}

                          {/* Top-right notification flag */}
                          <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur border border-slate-800 text-[9px] font-mono px-2 py-0.5 rounded text-indigo-300">
                            LIVE CAMERA DETECTED
                          </div>
                        </div>

                        {/* Device Sensor diagnostic state */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>ข้อมูลรับสัญญาณเซนเซอร์ปัจจุบัน (GPS Tracker)</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="bg-white p-2 rounded-xl border border-slate-200">
                              <span className="text-slate-400 block">พารามิเตอร์ละติจูด:</span>
                              <span className="text-slate-800 font-bold">{simLat.toFixed(6)}</span>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-slate-200">
                              <span className="text-slate-400 block">ลองจิจูด:</span>
                              <span className="text-slate-800 font-bold">{simLng.toFixed(6)}</span>
                            </div>
                            <div className="col-span-2 bg-white p-2 rounded-xl border border-slate-200 flex justify-between items-center">
                              <div>
                                <span className="text-slate-400">รัศมีความคลาดเคลื่อน:</span>
                                <span className="text-emerald-600 ml-1 font-bold">± 4.5 เมตร (High Precision)</span>
                              </div>
                              <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-250 font-bold">
                                GPS LOCK
                              </span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={triggerCheckinProcess}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-110 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          บันทึกภาพหน้าพร้อมพิกัดลงเวลาเดี๋ยวนี้
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-6 space-y-4">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                          checkinMessage.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {checkinMessage.status === 'success' ? (
                            <CheckCircle2 className="w-10 h-10" />
                          ) : (
                            <AlertTriangle className="w-10 h-10" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-850 font-sans">{checkinMessage.text}</h4>
                          <pre className="text-[10px] text-slate-700 mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                            {checkinMessage.details}
                          </pre>
                        </div>

                        <div className="pt-3 flex gap-2">
                          <button
                            onClick={() => {
                              setActiveScreen("dashboard");
                              setCheckinMessage(null);
                            }}
                            className="flex-1 bg-slate-905 hover:bg-slate-800 text-white py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                          >
                            กลับสู่หน้าเลือกจุด (Close)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hidden canvas for capturing real device frame */}
                    <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                  </div>
                )}


                {/* APP VIEW C: ADMIN CONSOLE DISPLAY */}
                {currentUser && currentUser.role === "admin" && (
                  <div className="w-full max-w-4xl mx-auto space-y-6">
                    
                    {/* Header bar and                     {/* Sub Tab selection for Admin Panel */}
                    <div className="flex bg-slate-100 p-1 border border-slate-200/50 rounded-2xl gap-1">
                      <button
                        onClick={() => setAdminSubTab("logs")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          adminSubTab === "logs"
                            ? "bg-white text-indigo-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Database className="w-3.5 h-3.5 text-indigo-600" />
                        ประวัติรายงานตัวครูเวร
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab("teachers");
                          setAddTeacherSuccess(null);
                          setAddTeacherError(null);
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          adminSubTab === "teachers"
                            ? "bg-white text-indigo-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                        จัดการข้อมูลอาจารย์และการลงทะเบียนครูใหม่ ({teachers.length})
                      </button>
                    </div>

                    {/* SUB-TAB A: LOGS */}
                    {adminSubTab === "logs" && (
                      <div className="space-y-6">
                        {/* Filter and search segment */}
                        <div className="bg-white border border-slate-200 p-4 rounded-3xl flex flex-col sm:flex-row gap-3 items-center shadow-sm shadow-slate-100">
                          <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 inset-y-0 my-auto" />
                            <input 
                              type="text"
                              placeholder="ค้นหาตามชื่อครูเวร หรือสถานที่..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 text-slate-800"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto shrink-0">
                            <select 
                              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-bold w-full sm:w-auto"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="all">กรองทั้งหมด (All Statuses)</option>
                              <option value="on-time">ตรงเวลา (On Time)</option>
                              <option value="late">สาย (Late)</option>
                              <option value="invalid_location">นอกพิกัด (Outside)</option>
                            </select>
                          </div>
                        </div>

                        {/* Logs Table */}
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shadow-slate-100">
                          <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200 text-[10px] font-bold">
                                <tr>
                                  <th className="p-4">รูปถ่ายยืนยันใบหน้า</th>
                                  <th className="p-4">ผู้รายงาน (ครูเวร)</th>
                                  <th className="p-4">สถานที่ปฏิบัติงาน (จุด)</th>
                                  <th className="p-4">วันเวลาลงชื่อ</th>
                                  <th className="p-4">ระยะห่างคำนวณ (เมตร)</th>
                                  <th className="p-4">ผลลัพธ์ประเมิน</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredLogs.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="text-center text-slate-400 p-8 font-sans font-semibold">
                                    ไม่พบข้อมูลการบันทึกประวัติการใช้จุดประสงค์นี้ในขณะนี้
                                    </td>
                                  </tr>
                                ) : (
                                  filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                      
                                      {/* Selfie thumb preview */}
                                      <td className="p-4">
                                        <div className="relative group/photo shrink-0 w-10">
                                          <img 
                                            src={log.image_path} 
                                            alt="Face capture" 
                                            className="w-10 h-10 object-cover rounded-xl border border-slate-200 group-hover/photo:border-indigo-500 transition-all shadow-md bg-slate-50"
                                          />
                                          <button 
                                            onClick={() => setShowPhotoModalUrl(log.image_path)}
                                            className="absolute inset-0 bg-slate-900/80 rounded-xl opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white transition-all text-[8px] font-bold cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>

                                      {/* Teacher details */}
                                      <td className="p-4">
                                        <div className="font-bold text-slate-850">{log.teacher_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono font-medium">{log.teacher_email}</div>
                                      </td>

                                      {/* Point details */}
                                      <td className="p-4">
                                        <div className="font-bold text-slate-700">{log.point_name}</div>
                                        <span className="text-[9px] text-slate-500 uppercase bg-slate-50 border border-slate-200 px-2.0 py-0.5 rounded-lg mt-1 inline-block font-semibold">
                                          จุดที่ {log.point_id}
                                        </span>
                                      </td>

                                      {/* Time checkin */}
                                      <td className="p-4">
                                        <span className="text-slate-650 font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl font-mono">
                                          {log.checkin_datetime} น.
                                        </span>
                                      </td>

                                      {/* Distance computed */}
                                      <td className="p-4 font-mono font-semibold">
                                        <div className="text-slate-805 font-black text-indigo-650">
                                          {log.distance_meters} ม.
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-medium font-mono">
                                          Lat: {log.latitude.toFixed(4)}, Lon: {log.longitude.toFixed(4)}
                                        </span>
                                      </td>

                                      {/* Evaluation state status */}
                                      <td className="p-4">
                                        <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-bold border inline-block ${
                                          log.status === "on-time" 
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            : log.status === "late"
                                              ? "bg-amber-50 text-amber-600 border-amber-250"
                                              : "bg-rose-50 text-rose-600 border-rose-250"
                                        }`}>
                                          {log.status === "on-time" && "✔ ตรงเวลา (On Time)"}
                                          {log.status === "late" && "⏰ สายช้า (Late)"}
                                          {log.status === "invalid_location" && "❌ นอกพิกัด (Outside)"}
                                        </span>
                                      </td>

                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB B: PERSONNEL REGISTRATION & DIRECTORY */}
                    {adminSubTab === "teachers" && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        
                        {/* ENROLLMENT FORM (cols 5) */}
                        <div className="md:col-span-5 bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-sm shadow-slate-100">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-650">
                              <UserPlus className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-800">เพิ่มและขึ้นทะเบียนครูเวรคนใหม่</h5>
                              <p className="text-[10px] text-slate-455 font-medium">กรอกชื่อและสร้างไอดีจำลองเพื่อร่วมสถิติตามระบบ</p>
                            </div>
                          </div>

                          {addTeacherSuccess && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] p-3 rounded-2xl flex items-start gap-1.5 animate-fade-in font-sans leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 text-emerald-650 shrink-0 mt-0.5" />
                              <span>{addTeacherSuccess}</span>
                            </div>
                          )}

                          {addTeacherError && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] p-3 rounded-2xl flex items-start gap-1.5 animate-fade-in font-sans">
                              <AlertTriangle className="w-4 h-4 text-rose-655 shrink-0 mt-0.5" />
                              <span>{addTeacherError}</span>
                            </div>
                          )}

                          <form onSubmit={handleAddTeacher} className="space-y-4 text-xs font-medium">
                            <div>
                              <label className="block text-slate-500 mb-1.5 font-bold">ชื่อ - นามสกุลครูผู้ปฏิบัติงาน</label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                  <User className="w-3.5 h-3.5" />
                                </span>
                                <input 
                                  type="text"
                                  required
                                  placeholder="ครูสมหญิง รักเรียน"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-bold"
                                  value={newTeacherName}
                                  onChange={(e) => setNewTeacherName(e.target.value)}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-500 mb-1.5 font-bold font-sans">อีเมลหน่วยงานวิทยาลัย (ใช้เข้าสู่ระบบ)</label>
                              <div className="relative font-sans">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-450 font-bold text-xs">
                                  @
                                </span>
                                <input 
                                  type="email"
                                  required
                                  placeholder="somying@school.ac.th"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-bold"
                                  value={newTeacherEmail}
                                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-500 mb-1.5 font-bold">สิทธิ์การใช้งาน (System Role)</label>
                              <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-bold text-slate-700 cursor-pointer"
                                value={newTeacherRole}
                                onChange={(e) => setNewTeacherRole(e.target.value as "teacher" | "admin")}
                              >
                                <option value="teacher">คุณครูผู้เวรสำหรับลงจุดปฏิบัติงาน (Teacher)</option>
                                <option value="admin">ผู้บริหารและผู้ควบคุมระบบ / ตรวจสอบสถิติด้านข้าง (Admin)</option>
                              </select>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[10px] text-slate-500 font-medium font-sans leading-relaxed">
                              🔐 <strong className="text-slate-700">รหัสผ่านพื้นฐาน:</strong> บัญชีจะได้รับรหัสผ่านเริ่มต้นเหมือนกันคือ <strong className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded font-mono">password123</strong> เพื่อให้สามารถใช้ปุ่มทางลัดและทดสอบฟังก์ชันตอกบัตรสแนปร่างจำลองได้อย่างรวดเร็ว
                            </div>

                            <button
                              type="submit"
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 hover:shadow-xs"
                            >
                              <Plus className="w-4 h-4" />
                              ลงทะเบียนอาจารย์ระบบเดี๋ยวนี้
                            </button>
                          </form>
                        </div>

                        {/* MEMBERS DIRECTORY LIST (cols 7) */}
                        <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shadow-slate-100">
                          <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-4 flex items-center justify-between">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                              <Database className="w-4 h-4 text-slate-450" />
                              ตารางทำเนียบอาจารย์ทั้งหมด ({teachers.length})
                            </span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-650 px-2.5 py-0.5 rounded-lg border border-indigo-100 font-bold font-mono">
                              LOCAL CO-DATA
                            </span>
                          </div>

                          <div className="divide-y divide-slate-120 max-h-[460px] overflow-y-auto">
                            {teachers.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 font-sans text-xs">
                                ไม่มีรายชื่อข้อมูลอาจารย์อยู่ในระบบ
                              </div>
                            ) : (
                              teachers.map((teacher) => {
                                const isSelf = currentUser && teacher.id === currentUser.id;
                                return (
                                  <div key={teacher.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/40 transition-all text-xs">
                                    <div className="flex items-center gap-3">
                                      {/* Stylized Circle Initials */}
                                      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                        teacher.role === 'admin' 
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                          : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                      }`}>
                                        {teacher.name.trim().charAt(3) || teacher.name.trim().charAt(0) || "T"}
                                      </div>
                                      <div className="max-w-[180px] sm:max-w-xs">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-800">{teacher.name}</span>
                                          {isSelf && (
                                            <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-sans scale-90">
                                              บัญชีท่าน
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-450 font-mono mt-0.5 truncate">{teacher.email}</div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold font-mono tracking-wide ${
                                        teacher.role === 'admin' 
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' 
                                          : 'bg-indigo-50 text-indigo-600 border border-indigo-150'
                                      }`}>
                                        {teacher.role === 'admin' ? "ADMIN" : "TEACHER"}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => setSelectedReportTeacher(teacher)}
                                        className="p-1.5 border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold"
                                        title="พิมพ์ใบรายงานสรุปและดาวน์โหลดไฟล์ PDF"
                                      >
                                        <FileText className="w-3.5 h-3.5 shrink-0" />
                                        <span className="text-[9px] font-bold">PDF</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTeacher(teacher.id)}
                                        disabled={isSelf}
                                        className={`p-1.5 border rounded-lg transition-all ${
                                          isSelf 
                                            ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50' 
                                            : 'text-slate-400 border-slate-200 hover:text-rose-600 hover:border-rose-200 cursor-pointer hover:bg-rose-50/20'
                                        }`}
                                        title={isSelf ? "ไม่สามารถลบตัวเองได้" : "เพิกถอนสิทธิ์"}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}



              </div>
            </div>

            {/* Simulated Live Mobile GPS and Time desk controls */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm shadow-slate-100">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Sliders className="w-5 h-5 text-indigo-650" />
                <div>
                  <h4 className="text-sm font-black text-slate-800">ห้องควบคุมสถานการณ์ (Simulation Control Center)</h4>
                  <p className="text-xs text-slate-500 font-medium font-sans">เลื่อนระยะเวลาจำลองหรือพิกัดสัญญาณดาวเทียมเพื่อทดสอบเงื่อนไขตรวจสอบทางสถิติ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Time controller section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-sans">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      จำลองเวลาปฏิบัติงาน (Simulated Clock):
                    </span>
                    <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                      {simTime} น.
                    </span>
                  </div>

                  <input 
                    type="range"
                    min="420" // 07:00 in minutes
                    max="570" // 09:30 in minutes
                    step="5"
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                    value={(() => {
                      const [h, m] = simTime.split(":").map(Number);
                      return h * 60 + m;
                    })()}
                    onChange={(e) => {
                      const totalMins = Number(e.target.value);
                      const hrs = Math.floor(totalMins / 60);
                      const mins = totalMins % 60;
                      setSimTime(`${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
                    }}
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                    <span>07:00 น. (เริ่มกะเช้า)</span>
                    <span>08:15 น. (เข้าคาบเสร็จ)</span>
                    <span>09:30 น. (หมดคาบตรวจ)</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-[11px] leading-relaxed text-slate-600 font-medium">
                    <strong className="text-slate-800">คำชี้แจงเพื่อนำเสนอท่านอาจารย์:</strong> ขยับเวลาไปที่ <span className="text-indigo-650 font-bold border-b border-indigo-250">07:15 น.</span> แล้วเช็คอินเพื่อดูผล <strong className="text-emerald-600">"ตรงเวลา"</strong>, และเขยิบไปเกิน <span className="text-indigo-650 font-bold border-b border-indigo-250">07:35 น.</span> เพื่อสังเกตพฤติกรรมบันทึกเป็นสัญลักษณ์ <strong className="text-amber-500">"สายช้า (Late)"</strong>!
                  </div>
                </div>

                {/* GPS controller section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-sans">
                      <Map className="w-4 h-4 text-indigo-650" />
                      จำลองตำแหน่งจีพีเอส (GPS Coordinate Set):
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg max-w-[150px] truncate">
                      Dist: {calculateHaversineDistance(simLat, simLng, BANGKOK_CENTER.lat, BANGKOK_CENTER.lng).toFixed(1)} ม.
                    </span>
                  </div>

                  {/* Lat Lng fine-tuning knobs */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Lat:</span>
                      <span className="text-indigo-600 font-black">{simLat.toFixed(6)}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Lon:</span>
                      <span className="text-indigo-600 font-black">{simLng.toFixed(6)}</span>
                    </div>
                  </div>

                  {/* Fast positions buttons */}
                  <div className="space-y-2">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">จุดด่วนลัดความถูกต้องเชิงพิกัด (GPS Presets):</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => handlePresetChange("exact-gate")}
                        className={`text-[9px] py-2 rounded-xl border cursor-pointer transition-all font-bold ${
                          gpsPreset === "exact-gate" 
                            ? "bg-indigo-50 border-indigo-250 text-indigo-600 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        ประตูหลัก (0 ม.)
                      </button>
                      <button 
                        onClick={() => handlePresetChange("near-gate")}
                        className={`text-[9px] py-2 rounded-xl border cursor-pointer transition-all font-bold ${
                          gpsPreset === "near-gate" 
                            ? "bg-indigo-50 border-indigo-250 text-indigo-600 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        ในสนามเวร (18 ม.)
                      </button>
                      <button 
                        onClick={() => handlePresetChange("far-gate")}
                        className={`text-[9px] py-2 rounded-xl border cursor-pointer transition-all font-bold ${
                          gpsPreset === "far-gate" 
                            ? "bg-rose-50 border-rose-250 text-rose-600 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        วิภาวดีภายนอก (145 ม.)
                      </button>
                    </div>
                  </div>

                  {/* Device location integration trigger */}
                  <div className="flex gap-2 pt-1 font-sans">
                    <button 
                      onClick={syncWithRealDeviceGps}
                      className="flex-1 text-[10px] bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2.5 rounded-xl text-slate-705 font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" /> ดึงพิกัดจริงด้วยมือถือคุณ
                    </button>
                    
                    <button 
                      onClick={() => setCameraMode(cameraMode === 'real' ? 'simulated' : 'real')}
                      className={`text-[10px] border py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold ${
                        cameraMode === 'real' 
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-600 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" /> {cameraMode === 'real' ? 'ปิดกล้องจริง' : 'เปิดจับกล้องจริง API'}
                    </button>
                  </div>

                  {geolocationError && (
                    <div className="text-[10px] text-rose-500 font-bold">{geolocationError}</div>
                  )}

                </div>

              </div>

            </div>

          </div>

          {/* RIGHT SIDEBAR (4 cols): Information & Educational Sidecard */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* University Project Math Cheat Sheet card */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm shadow-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-black text-slate-800 font-sans">สูตรคํานวณสําหรับตอบคําถามอาจารย์ (Mathematics Engine)</h4>
              </div>

              <div className="text-xs space-y-3 leading-relaxed text-slate-650 font-sans font-medium">
                <div>
                  อาจารย์ที่ปรึกษาโครงการมักจะถามเจาะลึกเรื่องการคํานวณระยะพิกัดบนผิวโลก (Great-circle Distance) ระบบนี้ใช้สูตร <strong className="text-indigo-650">Haversine Formula</strong> ซึ่งเขียนอธิบายเชิงทฤษฎีได้ดังนี้:
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl font-mono text-[10px] text-teal-400 leading-relaxed space-y-1 shadow-inner">
                  <div>a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)</div>
                  <div>c = 2 * atan2(√a, √(1-a))</div>
                  <div>d = R * c (โดยที่ R = 6,371,000 เมตร)</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="block text-[11px] font-bold text-slate-800">ความต่างของพิกัดดาวเทียมกับตำแหน่งครูเวร:</span>
                  <div className="text-[10px] text-slate-550 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span>ละติจูดจำลอง:</span>
                      <span className="text-slate-805 font-bold">{simLat.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ลองจิจูดจำลอง:</span>
                      <span className="text-slate-805 font-bold">{simLng.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-205 pt-1.5 mt-1 text-indigo-600 font-bold">
                      <span className="font-sans">ความคลาดเคลื่อนประตูหลัก:</span>
                      <span>{calculateHaversineDistance(simLat, simLng, 13.756300, 100.501800).toFixed(1)} ม.</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-400 italic">
                  * หมายเหตุ: Geolocation API และ Media Capture ในเบราว์เซอร์ต้องการการอนุมัติสิทธิ์การเข้าถึงอุปกรณ์จริงของท่าน และระบบจำลองประสิทธิภาพนี้มาเพื่vการนำเสนอทางสถิติระดับเกรดเอ
                </div>

              </div>
            </div>

          </div>

        </main>
      )}

      {/* -------------------------------------------------------------
          TAB 2: COMPLETE PHP / MYSQL SOURCE CODE EXPLORER
          ------------------------------------------------------------- */}
      {activeTab === "code_hub" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* File explorer listings column (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm shadow-slate-100">
              <h4 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest mb-3 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 border border-slate-200/50 rounded-xl w-fit">
                <Database className="w-4 h-4 text-indigo-600" /> สารบัญไฟล์โปรเจกต์ PHP / SQL
              </h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans font-medium">
                นี่คือส่วนสถาปัตยกรรมหลักสำหรับนำไปติดตั้งบนเว็บเซิร์ฟเวอร์จริง (XAMPP / Hosting) ดับเบิ้ลคลิกเพื่อเปิดดูโครงสร้างโค้ดและคัดลอก:
              </p>

              <div className="space-y-2">
                {codeTemplates.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFile(file.name)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs transition-all border text-left cursor-pointer ${
                      selectedFile === file.name 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-750 font-bold" 
                        : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100/85"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className={`w-4 h-4 shrink-0 ${selectedFile === file.name ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold opacity-80 uppercase px-2 py-0.5 rounded bg-white border border-slate-205 shrink-0">
                      {file.language}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 text-[11px] text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 font-sans font-medium leading-relaxed">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5 text-indigo-600" />
                  <span>คู่มือการติดตั้งเซิร์ฟเวอร์จำลอง:</span>
                </div>
                <ul className="list-disc list-inside space-y-1">
                  <li>นำเข้าไฟล์ <span className="font-mono text-indigo-600 font-bold bg-white px-1.5 py-0.5 border border-slate-200 rounded">db.sql</span> ผ่าน phpMyAdmin</li>
                  <li>สร้างโฟลเดอร์ชื่อ <span className="font-mono text-indigo-600 font-bold bg-white px-1.5 py-0.5 border border-slate-200 rounded">/uploads</span> ข้างในเซ็กเตอร์โปรเจกต์คู่กัน</li>
                  <li>นำโค้ดในไฟล์ PHP ไปวางใน <span className="font-mono text-indigo-600 font-bold bg-white px-1.5 py-0.5 border border-slate-200 rounded">htdocs/smart-duty/</span></li>
                  <li>เปิดและใช้งานจริงผ่านเบราว์เซอร์สมาร์ทโฟน</li>
                </ul>
              </div>
            </div>

            {/* Explainer checklist cards */}
            <div className="bg-white border border-slate-205 p-5 rounded-3xl space-y-3 shadow-sm shadow-slate-100">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" /> เคล็ดลับตอนพรีเซนต์
              </h4>
              <div className="text-xs text-slate-550 space-y-2 leading-relaxed font-sans font-medium">
                <p>
                  เวลาจัดแสดงผลงาน สามารถเริ่มสไลด์อธิบายแนวการระบุขอบเขต 2 ชั้น:
                </p>
                <div className="space-y-1.5 text-slate-500 text-[11px]">
                  <div>• <strong>ขั้นที่ 1 (GPS Fence):</strong> ตรวจรักษารัศมีครูด้วยสูตร Haversine หากเกินขอบเขต 50 เมตร บล็อกเช็คอินทันที</div>
                  <div>• <strong>ขั้นที่ 2 (Face Log):</strong> บังคับเปิดกล้องสแนปใบหน้าจริงก่อนอัปโหลด ป้องกันพฤติกรรมแทนกัน</div>
                  <div>• <strong>ขั้นที่ 3 (Time shift evaluation):</strong> ประเมินเวลาส่งเข้าเทียบตารางเพื่อแบ่งสถานะ On-time / Late สะกดสีชัดเจน</div>
                </div>
              </div>
            </div>

          </div>

          {/* Code viewer main panel (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            {(() => {
              const file = codeTemplates.find(f => f.name === selectedFile);
              if (!file) return null;

              return (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm shadow-slate-100">
                  
                  {/* Code header bar */}
                  <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-800">{file.name}</span>
                        <span className="text-[9px] px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-600 rounded-lg uppercase font-mono font-bold">
                          {file.language}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium font-sans">{file.description}</p>
                    </div>
                    
                    <button
                      onClick={() => handleCopyCode(file.content, file.name)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-indigo-100 transition-all shrink-0 w-full sm:w-auto justify-center cursor-pointer"
                    >
                      {copyFeedback === file.name ? (
                        <>
                          <Check className="w-3.5 h-3.5 animate-pulse" /> คัดลอกรหัสเรียบร้อย!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> คัดลอกสัญญาโค้ดนี้ (Copy Code)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Absolute code container */}
                  <div className="bg-slate-900 p-5 font-mono text-xs overflow-auto max-h-[580px] border-b border-slate-850 leading-relaxed scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-slate-900 shadow-inner">
                    <pre className="text-teal-400 selection:bg-slate-800 selection:text-white">
                      <code>{file.content}</code>
                    </pre>
                  </div>

                  <div className="bg-slate-50 px-5 py-3.5 text-[11px] text-slate-500 border-t border-slate-200 flex justify-between items-center font-medium font-sans">
                    <span>ประเภทการเข้ารหัสอักขระ: UTF-8 Unicode</span>
                    <span className="font-mono text-slate-400 font-bold">{file.content.split("\n").length} บรรทัด</span>
                  </div>

                </div>
              );
            })()}
          </div>

        </main>
      )}

      {/* -------------------------------------------------------------
          IMAGE VIEW MODAL popup for admin inspections
          ------------------------------------------------------------- */}
      {showPhotoModalUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl relative">
            
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 font-sans">
                <Camera className="w-4 h-4 text-indigo-600" /> ตรวจสอบสแนปครูเวร (Facial Record ID)
              </span>
              <button 
                onClick={() => setShowPhotoModalUrl(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-xl transition-all font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="p-6 flex items-center justify-center bg-slate-50/50">
              <img 
                src={showPhotoModalUrl} 
                alt="Enlarged Face Verification" 
                className="w-full max-w-[280px] h-auto object-cover rounded-2xl border border-slate-250 aspect-square shadow-sm bg-white"
              />
            </div>

            <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 font-sans border-t border-slate-150 font-medium">
              ถ่ายทำพิกัดยืนยันผ่านระบบเช็คอินดาวเทียมแบบเรียลไทม์
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright label */}
      <footer className="bg-white p-4.5 border-t border-slate-200 text-center text-xs text-slate-500 mt-auto font-sans font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 Smart Duty Check System - โครงการวิจัยและพัฒนานวัตกรรมมหาวิทยาลัย</span>
          <span className="text-slate-400 font-mono text-[10px] font-bold">Compiled Clean &bull; Native Location APIs Integrated</span>
        </div>
      </footer>

      </div>

      {/* -------------------------------------------------------------
          PRINT ONLY AREA (Perfect PDF/Print layout)
          ------------------------------------------------------------- */}
      {selectedReportTeacher && (
        <PrintableTeacherReport 
          teacher={selectedReportTeacher} 
          checkins={checkins} 
        />
      )}

      {/* Interactive Modal Preview Screen */}
      {selectedReportTeacher && (
        <TeacherReportPreviewModal 
          teacher={selectedReportTeacher} 
          checkins={checkins} 
          onClose={() => setSelectedReportTeacher(null)} 
        />
      )}
    </>
  );
}

// -------------------------------------------------------------
// Sibling Sub-component: PrintableTeacherReport (A4 Print-only)
// -------------------------------------------------------------
function PrintableTeacherReport({ teacher, checkins }: { teacher: Teacher; checkins: CheckInRecord[] }) {
  const teacherCheckins = checkins.filter(
    c => c.teacher_id === teacher.id || c.teacher_email.toLowerCase() === teacher.email.toLowerCase()
  );

  const total = teacherCheckins.length;
  const onTime = teacherCheckins.filter(c => c.status === "on-time").length;
  const late = teacherCheckins.filter(c => c.status === "late").length;
  const outside = teacherCheckins.filter(c => c.status === "invalid_location").length;
  const successRatio = total > 0 ? ((onTime / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="hidden print:block text-slate-900 bg-white p-10 font-sans leading-relaxed text-xs max-w-[210mm] mx-auto min-h-[297mm]">
      {/* Garuda/Decorative Crest */}
      <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b-2 border-slate-950 mb-6">
        <div className="w-14 h-14 bg-indigo-50 rounded-full border border-indigo-750 font-serif flex items-center justify-center text-indigo-700 text-xl font-bold">
          SDC
        </div>
        <h1 className="text-sm font-black text-slate-950 tracking-tight mt-1">รายงานสรุปการปฏิบัติหน้าที่และสถิติประพฤติครูเวรรายบุคคล</h1>
        <h2 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          ระบบเช็คอินตอกบัตรดาวเทียมอัจฉริยะ (Smart Duty Check - Teacher Report)
        </h2>
        <span className="text-[9px] text-slate-450 font-mono">
          Ref Serial Code: SDC-2026-REG-{teacher.id.toString().padStart(4, "0")}
        </span>
      </div>

      {/* Profile summary */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 border border-slate-205 p-4 rounded-xl leading-relaxed">
        <div>
          <p className="font-bold text-slate-800 text-[11px]">ข้อมูลผู้รับการประเมิน:</p>
          <p className="mt-1 font-semibold text-slate-700">ชื่อ-นามสกุล: {teacher.name}</p>
          <p className="text-slate-500">อีเมลลงทะเบียนภารกิจ: {teacher.email}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800 text-[11px]">ข้อมูลสถานะการปฏิบัติงานในระบบ:</p>
          <p className="mt-1 font-semibold text-slate-700">
            ตำแหน่งสถานภาพเวร: {teacher.role === "admin" ? "ผู้ควบคุมบริหารระบบ (Admin)" : "ครูเวรปฏิบัติหน้าที่ (Teacher)"}
          </p>
          <p className="text-slate-500">วันที่สังเคราะห์ใบสรุป: {new Date().toLocaleDateString("th-TH")}</p>
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="grid grid-cols-4 gap-3 text-center mb-6">
        <div className="border border-slate-300 p-3 rounded-lg bg-slate-50/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">สรุปตอกการประพฤติ (ครั้ง)</p>
          <p className="text-lg font-black text-slate-800 mt-1">{total}</p>
        </div>
        <div className="border border-slate-350 p-3 rounded-lg bg-emerald-50">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">เช็คอินตรงเวลาสัมพัทธ์</p>
          <p className="text-lg font-black text-emerald-700 mt-1">{onTime}</p>
        </div>
        <div className="border border-slate-350 p-3 rounded-lg bg-amber-50">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">บันทึกแตะเวลาช้า</p>
          <p className="text-lg font-black text-amber-700 mt-1">{late}</p>
        </div>
        <div className="border border-slate-350 p-3 rounded-lg bg-rose-50">
          <p className="text-[10px] uppercase tracking-wider text-rose-600 font-bold">เช็คอินนอกพิกัดดาวเทียม</p>
          <p className="text-lg font-black text-rose-700 mt-1">{outside}</p>
        </div>
      </div>

      <div className="border border-slate-300 p-3 rounded-xl mb-6 flex justify-between items-center bg-indigo-50/10">
        <span className="font-bold text-slate-800 text-[10px]">อัตราความปฏิบัติหน้าที่เวรสำเร็จสัมบูรณ์ (Standard Duty Performance Ratio):</span>
        <span className="text-base font-black text-indigo-700 font-mono">{successRatio}%</span>
      </div>

      {/* Table section */}
      <div className="mb-8">
        <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-300 pb-1.5 flex items-center gap-1.5">
          บัญชีประวัติลงเวลาและสแนปหน้าตรวจเวรที่ผ่านมา
        </h3>
        
        {teacherCheckins.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-sans">
            ไม่พบข้อมูลการบันทึกประวัติการใช้จุดประสงค์นี้ในระบบฐานข้อมูล
          </div>
        ) : (
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-b border-slate-300">
                <th className="p-2 border border-slate-300 w-10 text-center">ลำดับ</th>
                <th className="p-2 border border-slate-300">วันเวลาทำรายการ</th>
                <th className="p-2 border border-slate-300">จุดลงที่เลือกตอกความผิดชอบ</th>
                <th className="p-2 border border-slate-300">ค่าคลาดเคลื่อนสัญญาณ</th>
                <th className="p-2 border border-slate-300 text-center">การประเมิน</th>
                <th className="p-2 border border-slate-300 text-center">ภาพใบหน้าอ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              {teacherCheckins.map((log, index) => (
                <tr key={log.id} className="border-b border-slate-300 text-[10px] text-slate-800 whitespace-nowrap">
                  <td className="p-2 border border-slate-300 text-center font-mono font-bold">{index + 1}</td>
                  <td className="p-2 border border-slate-300 font-mono">{log.checkin_datetime} น.</td>
                  <td className="p-2 border border-slate-300 font-bold">{log.point_name} (จุดที่ {log.point_id})</td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-600">{log.distance_meters} ม.</td>
                  <td className="p-2 border border-slate-300 text-center font-bold">
                    {log.status === "on-time" && "✔ ตรงเวลา (On Time)"}
                    {log.status === "late" && "⏰ สายล่าช้า (Late)"}
                    {log.status === "invalid_location" && "❌ นอกเกณฑ์ (Outside)"}
                  </td>
                  <td className="p-2 border border-slate-300 text-center border-collapse">
                    {log.image_path ? (
                      <div className="flex items-center justify-center">
                        <img 
                          src={log.image_path} 
                          alt="Selfie Check" 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded border border-slate-300 shadow-xs"
                        />
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Official signature block */}
      <div className="mt-14 font-sans text-center">
        <p className="text-[10px] text-slate-500 mb-10 italic">ขอรับรองข้อความประวัติการปฏิบัติหน้าและพิกัดดาวเทียมข้างต้นว่าเป็นจริงและรับทราบตามเกณฑ์มาตรฐานวิทยาลัย</p>
        <div className="grid grid-cols-2 gap-8 pt-6">
          <div className="space-y-1 bg-white">
            <p className="mb-10 text-slate-300">ลงชื่อ ....................................................................................</p>
            <p className="font-bold text-slate-850 text-xs">( {teacher.name} )</p>
            <p className="text-[10px] text-slate-500 font-medium font-sans">คุณครูผู้ปฏิบัติเวรประจำการ / ผู้รายงานการประพฤติ</p>
          </div>
          <div className="space-y-1 bg-white">
            <p className="mb-10 text-slate-300 font-bold">ลงชื่อ ....................................................................................</p>
            <p className="font-bold text-slate-850 text-xs">( .................................................................................... )</p>
            <p className="text-[10px] text-slate-500 font-medium font-sans">ผู้อำนวยการวิทยาลัยสถานศึกษา / ผู้ลงนามรับรับรองอนุมัติรายงาน</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sibling Sub-component: TeacherReportPreviewModal (Screen View)
// -------------------------------------------------------------
function TeacherReportPreviewModal({ 
  teacher, 
  checkins, 
  onClose 
}: { 
  teacher: Teacher; 
  checkins: CheckInRecord[]; 
  onClose: () => void;
}) {
  const teacherCheckins = checkins.filter(
    c => c.teacher_id === teacher.id || c.teacher_email.toLowerCase() === teacher.email.toLowerCase()
  );

  const total = teacherCheckins.length;
  const onTime = teacherCheckins.filter(c => c.status === "on-time").length;
  const late = teacherCheckins.filter(c => c.status === "late").length;
  const outside = teacherCheckins.filter(c => c.status === "invalid_location").length;
  const successRatio = total > 0 ? ((onTime / total) * 100).toFixed(1) : "0.0";

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden overflow-y-auto font-sans leading-relaxed">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col my-8 max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-650">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">ตัวอย่างรายงานและบันทึกดาวน์โหลดออฟฟิเชียล PDF</h4>
              <p className="text-[10px] text-slate-450 font-semibold font-sans">พรีวิวก่อนบันทึกใบรายงานผลปฏิบัติหน้าที่ของ {teacher.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl transition-all font-bold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* Scrollable preview body */}
        <div className="p-6 overflow-y-auto bg-slate-100/50 flex-1 space-y-6 text-xs">
          
          {/* Printing Alert Guide */}
          <div className="bg-indigo-50 border border-indigo-150 p-4 rounded-2xl flex gap-3 leading-relaxed text-indigo-850">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-bold font-sans">วิธีการสั่งดาวน์โหลดรายงานเป็นไฟล์ PDF:</p>
              <p className="mt-0.5 text-slate-650 font-sans font-medium">เมื่อท่านคลิกปุ่มสีน้ำเงิน <strong className="text-slate-900 font-sans text-xs">"พิมพ์หรือบันทึกไฟล์รายงาน PDF (A4)"</strong> ด้านล่าง เบราว์เซอร์จะเรียกแผงพิมพ์เอกสารของเครื่องท่านขึ้นมา ให้เลือกหัวข้อปลายทาง (Destination) เป็น <strong className="text-indigo-700 bg-white border border-indigo-150 px-1.5 py-0.5 rounded font-bold font-sans">"บันทึกเป็น PDF" (Save as PDF)</strong> แล้วจัดพิมพ์เพื่อเซฟไฟล์รายงานทางการตัวนี้ลงในเครื่องเพื่อแชร์หรือเก็บประวัติได้เลย</p>
            </div>
          </div>

          {/* Render exact visual matching inside the box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-slate-800 space-y-6 font-sans">
            {/* Logo area */}
            <div className="text-center pb-4 border-b border-slate-200 flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-black shrink-0 relative mb-2 shadow-xs">
                SDC
              </div>
              <h2 className="font-extrabold text-slate-905 text-xs font-sans">วิทยาลัยสารพัดช่างวิทยาเขตกลางน้ำ</h2>
              <p className="text-[10px] text-slate-450 font-bold mt-0.5 font-sans">รายงานผลประเมินความประพฤติและการปฏิบัติภารกิจเวรจำลองรายบุคคล</p>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 leading-relaxed font-sans text-[11px]">
              <div>
                <span className="text-slate-450 font-medium block font-sans">คุณครูผู้ปฏิบัติงาน:</span>
                <span className="font-bold text-slate-800 font-sans text-xs">{teacher.name}</span>
                <span className="block text-[10px] text-slate-450 font-mono mt-0.5">{teacher.email}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-450 font-medium block font-sans">สิทธิ์บทบาทที่ได้รับมอบหมาย:</span>
                <span className="font-bold text-indigo-700 font-sans text-xs">{teacher.role === "admin" ? "ผู้ควบคุมแอดมินระบบ" : "คุณครูผู้ลงจุดประสงค์เวร"}</span>
                <span className="block text-[10px] text-slate-450 font-mono mt-0.5">สถานภาพ: ใช้งานได้ทันที</span>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase">การตรวจสลักทั้งหมด</div>
                <div className="text-sm font-black text-slate-800 mt-0.5 font-mono">{total} ครั้ง</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl shadow-xs">
                <div className="text-[10px] text-emerald-650 font-bold uppercase">เช็คอินตรงเวลา</div>
                <div className="text-sm font-black text-emerald-700 mt-0.5 font-mono">{onTime} ครั้ง</div>
              </div>
              <div className="bg-amber-50 border border-amber-150 p-3 rounded-xl shadow-xs">
                <div className="text-[10px] text-amber-655 font-bold uppercase">บันทึกแตะสายช้า</div>
                <div className="text-sm font-black text-amber-700 mt-0.5 font-mono">{late} ครั้ง</div>
              </div>
              <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl shadow-xs">
                <div className="text-[10px] text-rose-655 font-bold uppercase">เช็คอินนอกพิกัดเวร</div>
                <div className="text-sm font-black text-rose-700 mt-0.5 font-mono">{outside} ครั้ง</div>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-700 text-xs font-sans">คะแนนสมรรถนะการปฏิบัติภารกิจโดยเฉลี่ย:</span>
                <span className="block text-[10px] text-slate-450 font-sans">คำนวณตามดัชนีชี้วัดกฎระเบียบของระบบแอดมินนวัตกรรม</span>
              </div>
              <span className="text-lg font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-xl font-mono">
                {successRatio}%
              </span>
            </div>

            {/* List mini table */}
            <div>
              <p className="font-bold text-slate-850 mb-2 border-b border-slate-150 pb-1.5 flex items-center gap-1 text-xs">
               สลักประวัติลงเวลา (สรุป {total} รายการ)
              </p>
              
              {teacherCheckins.length === 0 ? (
                <p className="text-center text-slate-400 p-6 italic font-sans text-xs">ไม่พบร่องรอยการตอกบัตรใดๆ ในสารระบบสำหรับคุณครูท่านนี้</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-[10px] leading-relaxed">
                    <thead>
                      <tr className="bg-slate-50 text-slate-550 border-b border-slate-200 font-bold">
                        <th className="p-2 w-8 text-center border-r border-slate-200">ลำดับ</th>
                        <th className="p-2 border-r border-slate-200">เวลาการตอกบัตรเวร</th>
                        <th className="p-2 border-r border-slate-200">ตำแหน่งจุดที่ขาน</th>
                        <th className="p-2 text-center">ผลลัพธ์</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherCheckins.map((lg, idx) => (
                        <tr key={lg.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                          <td className="p-2 border-r border-slate-150 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-150 font-mono text-slate-650">{lg.checkin_datetime} น.</td>
                          <td className="p-2 border-r border-slate-150 font-bold text-slate-720">{lg.point_name}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border inline-block ${
                              lg.status === "on-time" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-150"
                                : lg.status === "late"
                                  ? "bg-amber-50 text-amber-600 border-amber-150"
                                  : "bg-rose-50 text-rose-600 border-rose-150"
                            }`}>
                              {lg.status === "on-time" && "ตรงเวลา"}
                              {lg.status === "late" && "ตอกช้า"}
                              {lg.status === "invalid_location" && "นอกเขต"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer actions */}
        <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans font-mono">
            A4 Print Layout Synthesizer v1.2
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-650 border border-slate-250 hover:text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs font-sans"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={handlePrint}
              className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:shadow-lg font-sans"
            >
              พิมพ์หรือบันทึกไฟล์รายงาน PDF (A4)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
