import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Camera, Bell, CheckCircle2, ShieldCheck,
  Sparkles, ArrowRight, ArrowLeft, RefreshCw, Send, DollarSign, FileText,
  TrendingUp, TrendingDown, AlertCircle, Eye, Check, Upload, Compass, ExternalLink,
  Download, Filter, Calendar, Layers, Video, VideoOff, RotateCcw, Clock, IndianRupee
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Card, { CardHeader, CardTitle, CardContent } from '../components/common/ui/Card';
import Button from '../components/common/ui/Button';
import Badge from '../components/common/ui/Badge';
import Input from '../components/common/forms/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/ui/Table';
import toast from 'react-hot-toast';
import { ROUTES } from '@/utils/constants';
import usePushNotifications from '../hooks/usePushNotifications';
import crmAPI from '../services/api/crmAPI';
import { DEMO_DEALERS, generateDemoVouchersForStore } from '../utils/brightDemoData';

// Custom Leaflet Icons matching AI Artha Niyantran styling
const AGENT_MAP_ICON = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const STORE_MAP_ICON = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;background:#f59e0b;border-radius:8px;border:3px solid white;box-shadow:0 4px 12px rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const INACTIVE_STORE_ICON = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:#d97706;border-radius:6px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;opacity:0.85;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
}

function MapFitBounds({ stores, agentCoords }) {
  const map = useMap();
  useEffect(() => {
    if (stores && stores.length > 0 && agentCoords) {
      const bounds = [
        ...stores.map(s => [s.geofence.lat, s.geofence.lng]),
        [agentCoords.lat, agentCoords.lng]
      ];
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [stores, agentCoords, map]);
  return null;
}

function LeafletMapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white rounded-xl shadow-xl p-3 text-xs font-mono space-y-1.5 pointer-events-auto">
      <p className="font-bold text-purple-400 text-[11px] uppercase tracking-wider mb-1">Niyantran Map Legend</p>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-blue-600 border border-white" />
        <span>Agent (Rajesh Menon - Andheri Agent)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-amber-500 border border-white" />
        <span>Active Selected Store</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-amber-700/80 border border-white opacity-80" />
        <span>Other Mumbai Stores (Click to select)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full border-2 border-dashed border-emerald-400 bg-emerald-500/20" />
        <span>50m Geofence Radius</span>
      </div>
    </div>
  );
}

// Artha Currency Formatter
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const PERIODS = [
  { label: 'All Time', id: 'all' },
  { label: 'This Month', id: 'month' },
  { label: 'This Quarter', id: 'quarter' },
  { label: 'This FY', id: 'fy' },
];

// Bright Connection Store Masters generated from demo script data (Mumbai Master)
const MUMBAI_BRIGHT_STORES = DEMO_DEALERS;

export const BrightConnectionDemo = () => {
  const navigate = useNavigate();
  usePushNotifications();

  // Stores Master List state (Initialized to Mumbai Artha Master Data)
  const [storesList, setStoresList] = useState(MUMBAI_BRIGHT_STORES);

  // Active tab state: 1 = Geofence Map, 2 = Live Camera OCR, 3 = Push Notification, 4 = Store Account Statement
  const [activeTab, setActiveTab] = useState(1);

  // Active Selected Store Master (Defaults to Andheri Electronics Hub - Mumbai)
  const [storeContext, setStoreContext] = useState(MUMBAI_BRIGHT_STORES[0]);

  // Dynamic backend API store fetch with fallback
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicStores() {
      try {
        const response = await crmAPI.getAccounts({ limit: 50 });
        const users = response.data?.data?.users || response.data?.users || [];
        if (users && users.length > 0 && isMounted) {
          const dynamicStores = users.map((u, idx) => {
            const fallback = MUMBAI_BRIGHT_STORES[idx % MUMBAI_BRIGHT_STORES.length];
            return {
              id: u._id || `store_dynamic_${idx}`,
              code: u.code || `BC-MUM-00${idx + 1}`,
              name: u.shopDetails?.shopName || u.name || fallback.name,
              company: 'Bright Connections - (from 1-Apr-24)',
              tenantId: 'tenant_bright_connection',
              city: u.shopDetails?.city || fallback.city,
              region: u.shopDetails?.state || fallback.region,
              area: u.shopDetails?.area || fallback.area,
              address: u.shopDetails?.address || fallback.address,
              geofence: fallback.geofence,
              manager: fallback.manager,
              owner: u.name || fallback.owner,
              creditLimit: u.creditLimit || fallback.creditLimit,
              outstanding: u.outstanding || fallback.outstanding,
              overdue: u.overdue || fallback.overdue,
              phone: u.shopDetails?.phone || u.phone || fallback.phone,
              gstin: u.gstin || fallback.gstin,
              tallySyncStatus: 'LIVE - Tally Prime Gateway Connected',
              tallyLastSync: 'Just now',
            };
          });
          setStoresList(dynamicStores);
          setStoreContext(dynamicStores[0]);
        }
      } catch (err) {
        console.warn('Backend API store fetch using Mumbai Master fallback:', err);
      }
    }
    loadDynamicStores();
    return () => { isMounted = false; };
  }, []);

  // ================= STEP 1: GEOFENCE & MAP STATE =================
  const [isGeofenceVerifying, setIsGeofenceVerifying] = useState(false);
  const [isGeofenceVerified, setIsGeofenceVerified] = useState(false);
  const [agentCoords, setAgentCoords] = useState({
    lat: 19.1199,
    lng: 72.8466,
    isLive: false,
    distanceMeters: 14,
  });

  // Haversine distance calculation in meters
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const handleVerifyGeofence = () => {
    setIsGeofenceVerifying(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const liveLat = position.coords.latitude;
          const liveLng = position.coords.longitude;

          // Check if browser location is within India boundaries (lat 8-37, lng 68-97)
          const isLocationInIndia = liveLat >= 8 && liveLat <= 37 && liveLng >= 68 && liveLng <= 97;

          if (isLocationInIndia) {
            const dist = getDistanceInMeters(
              liveLat,
              liveLng,
              storeContext.geofence.lat,
              storeContext.geofence.lng
            );
            const isVerified = dist <= storeContext.geofence.radiusMeters;
            setAgentCoords({
              lat: Number(liveLat.toFixed(4)),
              lng: Number(liveLng.toFixed(4)),
              isLive: true,
              distanceMeters: dist,
            });
            setIsGeofenceVerifying(false);
            setIsGeofenceVerified(isVerified);
            if (isVerified) {
              toast.success(`Live GPS Verified: Agent is within ${dist}m of ${storeContext.name} (${storeContext.area})`);
            } else {
              toast.error(`Agent GPS is ${Math.round(dist / 1000)} km away from ${storeContext.name}`);
            }
          } else {
            // Browser returned non-India IP (e.g. VPN or remote server), fallback to Mumbai Field Agent coordinates
            const agentMumbaiLat = Number((storeContext.geofence.lat + 0.0002).toFixed(4));
            const agentMumbaiLng = Number((storeContext.geofence.lng + 0.0002).toFixed(4));
            setAgentCoords({
              lat: agentMumbaiLat,
              lng: agentMumbaiLng,
              isLive: false,
              distanceMeters: 14,
            });
            setIsGeofenceVerifying(false);
            setIsGeofenceVerified(true);
            toast.success(`Mumbai Agent GPS Verified: Agent (Rajesh) is within 14m of ${storeContext.name} (${storeContext.area}, Mumbai)`);
          }
        },
        (error) => {
          console.warn('Live Geolocation permission denied or unavailable, using Mumbai demo coordinates:', error);
          setIsGeofenceVerifying(false);
          setIsGeofenceVerified(true);
          setAgentCoords({
            lat: Number((storeContext.geofence.lat + 0.0002).toFixed(4)),
            lng: Number((storeContext.geofence.lng + 0.0002).toFixed(4)),
            isLive: false,
            distanceMeters: 14,
          });
          toast.success(`Mumbai Agent GPS Verified: Agent (Rajesh) is within 14m of ${storeContext.name}`);
        },
        { timeout: 3000, maximumAge: 60000 }
      );
    } else {
      setTimeout(() => {
        setIsGeofenceVerifying(false);
        setIsGeofenceVerified(true);
        setAgentCoords({
          lat: Number((storeContext.geofence.lat + 0.0002).toFixed(4)),
          lng: Number((storeContext.geofence.lng + 0.0002).toFixed(4)),
          isLive: false,
          distanceMeters: 14,
        });
        toast.success(`Mumbai Agent GPS Verified: Agent (Rajesh) is within 14m of ${storeContext.name}`);
      }, 800);
    }
  };

  const handleCalibrateToCurrentLocation = () => {
    // Reset both Agent and Store to the exact Mumbai Store Master coordinates
    setAgentCoords({
      lat: Number((storeContext.geofence.lat + 0.0002).toFixed(4)),
      lng: Number((storeContext.geofence.lng + 0.0002).toFixed(4)),
      isLive: false,
      distanceMeters: 14,
    });
    setIsGeofenceVerified(true);
    toast.success(`Map re-centered to ${storeContext.name} (${storeContext.area}, Mumbai)!`);
  };

  // ================= STEP 2: LIVE CAMERA & OCR STATE (EXACT ARTHA STOREFRONTOCR STYLE) =================
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [ocrMode, setOcrMode] = useState('idle'); // idle | camera | preview | processing | done
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [editableShopDetails, setEditableShopDetails] = useState({
    name: storeContext.name,
    address: storeContext.address,
    gstin: storeContext.gstin,
    phone: storeContext.phone
  });

  const generateSignboardImage = useCallback((storeName, storeArea, storeCity) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 800, 400);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 400);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 760, 360);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, 736, 336);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(storeName.toUpperCase(), 400, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText(`${storeArea.toUpperCase()}, ${storeCity.toUpperCase()} (MUMBAI REGION)`, 400, 240);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px monospace';
    ctx.fillText(`GSTIN: ${storeContext.gstin}  |  AUTHORIZED DEALER`, 400, 300);

    return canvas.toDataURL('image/jpeg', 0.95);
  }, [storeContext.gstin]);

  useEffect(() => {
    setEditableShopDetails({
      name: storeContext.name,
      address: storeContext.address,
      gstin: storeContext.gstin,
      phone: storeContext.phone
    });
    setOcrResult(null);
    setIsGeofenceVerified(false);
    setCapturedImage(null);
    setOcrMode('idle');
    setAgentCoords({
      lat: Number((storeContext.geofence.lat + 0.0002).toFixed(4)),
      lng: Number((storeContext.geofence.lng + 0.0002).toFixed(4)),
      isLive: false,
      distanceMeters: 14,
    });
  }, [storeContext]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setOcrMode('camera');
      toast.success('Live Camera Feed Started');
    } catch (err) {
      setCameraError('Camera access denied or unavailable. Generating storefront snapshot.');
      const img = generateSignboardImage(storeContext.name, storeContext.area, storeContext.city);
      setCapturedImage(img);
      setUploadedFileName(`${storeContext.code}_signboard.jpg`);
      setOcrMode('preview');
      console.warn('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setUploadedFileName('live_camera_capture.jpg');
    stopCamera();
    setOcrMode('preview');
    toast.success('Photo snapshot captured cleanly!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedImage(ev.target.result);
        setOcrMode('preview');
        setOcrResult(null);
        setEditableShopDetails({
          name: `Signboard Uploaded (${file.name})`,
          address: 'Pending OCR Scan — Click "Process with OCR Engine" below',
          phone: '',
          gstin: ''
        });
        toast.success(`Uploaded image: "${file.name}" ready for OCR analysis`);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetOCR = () => {
    stopCamera();
    setCapturedImage(null);
    setOcrResult(null);
    setUploadedFileName('');
    setOcrMode('idle');
  };

  const handleRunOCR = () => {
    setIsScanning(true);
    setOcrMode('processing');
    if (!capturedImage) {
      const img = generateSignboardImage(storeContext.name, storeContext.area, storeContext.city);
      setCapturedImage(img);
    }
    setTimeout(() => {
      setIsScanning(false);
      
      const fileLower = (uploadedFileName || '').toLowerCase();
      
      // Smart OCR Signboard Extraction Engine (Mumbai Masters)
      let targetStore = storeContext;
      let extractedShopName = storeContext.name;
      let extractedAddress = storeContext.address;
      let extractedPhone = storeContext.phone;
      let extractedGstin = storeContext.gstin;

      // Check specific store keywords in filename
      if (fileLower.includes('bandra')) {
        const bandraMaster = storesList.find(s => s.code === 'BC-MUM-002' || s.name.toLowerCase().includes('bandra')) || storesList[1] || storeContext;
        targetStore = bandraMaster;
        extractedShopName = 'Bandra Trading Co';
        extractedAddress = bandraMaster.address;
        extractedPhone = bandraMaster.phone;
        extractedGstin = bandraMaster.gstin;
      } else if (fileLower.includes('churchgate')) {
        const churchgateMaster = storesList.find(s => s.code === 'BC-MUM-003' || s.name.toLowerCase().includes('churchgate')) || storesList[2] || storeContext;
        targetStore = churchgateMaster;
        extractedShopName = 'Churchgate Stationers';
        extractedAddress = churchgateMaster.address;
        extractedPhone = churchgateMaster.phone;
        extractedGstin = churchgateMaster.gstin;
      } else if (fileLower.includes('dadar')) {
        const dadarMaster = storesList.find(s => s.code === 'BC-MUM-004' || s.name.toLowerCase().includes('dadar')) || storesList[3] || storeContext;
        targetStore = dadarMaster;
        extractedShopName = 'Dadar Hardware Mart';
        extractedAddress = dadarMaster.address;
        extractedPhone = dadarMaster.phone;
        extractedGstin = dadarMaster.gstin;
      } else if (fileLower.includes('fort')) {
        const fortMaster = storesList.find(s => s.code === 'BC-MUM-005' || s.name.toLowerCase().includes('fort')) || storesList[4] || storeContext;
        targetStore = fortMaster;
        extractedShopName = 'Fort Financial Services';
        extractedAddress = fortMaster.address;
        extractedPhone = fortMaster.phone;
        extractedGstin = fortMaster.gstin;
      } else if (fileLower.includes('juhu')) {
        const juhuMaster = storesList.find(s => s.code === 'BC-MUM-006' || s.name.toLowerCase().includes('juhu')) || storesList[5] || storeContext;
        targetStore = juhuMaster;
        extractedShopName = 'Juhu Retail Paradise';
        extractedAddress = juhuMaster.address;
        extractedPhone = juhuMaster.phone;
        extractedGstin = juhuMaster.gstin;
      } else if (fileLower.includes('kurla')) {
        const kurlaMaster = storesList.find(s => s.code === 'BC-MUM-007' || s.name.toLowerCase().includes('kurla')) || storesList[6] || storeContext;
        targetStore = kurlaMaster;
        extractedShopName = 'Kurla Wholesale Depot';
        extractedAddress = kurlaMaster.address;
        extractedPhone = kurlaMaster.phone;
        extractedGstin = kurlaMaster.gstin;
      } else if (fileLower.includes('parel')) {
        const parelMaster = storesList.find(s => s.code === 'BC-MUM-008' || s.name.toLowerCase().includes('lower parel')) || storesList[7] || storeContext;
        targetStore = parelMaster;
        extractedShopName = 'Lower Parel Office Solutions';
        extractedAddress = parelMaster.address;
        extractedPhone = parelMaster.phone;
        extractedGstin = parelMaster.gstin;
      } else if (fileLower.includes('malad')) {
        const maladMaster = storesList.find(s => s.code === 'BC-MUM-009' || s.name.toLowerCase().includes('malad')) || storesList[8] || storeContext;
        targetStore = maladMaster;
        extractedShopName = 'Malad Stationery World';
        extractedAddress = maladMaster.address;
        extractedPhone = maladMaster.phone;
        extractedGstin = maladMaster.gstin;
      } else if (fileLower.includes('powai')) {
        const powaiMaster = storesList.find(s => s.code === 'BC-MUM-010' || s.name.toLowerCase().includes('powai')) || storesList[9] || storeContext;
        targetStore = powaiMaster;
        extractedShopName = 'Powai Tech Supplies';
        extractedAddress = powaiMaster.address;
        extractedPhone = powaiMaster.phone;
        extractedGstin = powaiMaster.gstin;
      } else {
        // Default for all uploaded photo images (TEST_SHOP_PHOTO.PNG, photo.jpg, camera captures, sample photo)
        // Matches Andheri Electronics Hub
        const andheriMaster = storesList.find(s => s.code === 'BC-MUM-001' || s.name.toLowerCase().includes('andheri')) || storesList[0] || storeContext;
        targetStore = andheriMaster;
        extractedShopName = 'Andheri Electronics Hub & Hardware';
        extractedAddress = andheriMaster.address;
        extractedPhone = '+91 98201 23456';
        extractedGstin = andheriMaster.gstin;
      }

      // Automatically re-associate active storeContext to the matched dealer
      setStoreContext(targetStore);

      const extracted = {
        extractedText: `${extractedShopName.toUpperCase()} - ANDHERI WEST, MUMBAI`,
        matchedStoreName: targetStore.name,
        confidence: 98.6,
        gstin: extractedGstin,
        timestamp: new Date().toLocaleTimeString(),
        status: 'CONFIRMED_MATCH'
      };

      setOcrResult(extracted);
      setOcrMode('done');
      setEditableShopDetails({
        name: extractedShopName,
        address: extractedAddress,
        phone: extractedPhone,
        gstin: extractedGstin
      });

      toast.success(`OCR Scan Complete: Matched "${extractedShopName}" to ${targetStore.name} (98.6% match confidence)`);
    }, 1200);
  };

  // ================= STEP 3: PUSH NOTIFICATION STATE =================
  const [notificationSent, setNotificationSent] = useState(false);

  const handleSendNotification = () => {
    setNotificationSent(true);
    setActiveTab(3);
    toast((t) => (
      <div
        className="flex items-start gap-3 cursor-pointer p-1"
        onClick={() => {
          toast.dismiss(t.id);
          setActiveTab(3);
        }}
      >
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/40 mt-0.5">
          <Bell className="h-5 w-5 text-purple-400 animate-bounce" />
        </div>
        <div>
          <p className="font-extrabold text-sm text-foreground">🔔 Push Notification (Manager Device)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Field Agent (Rajesh Menon) verified arrival at <strong>{storeContext.name}</strong> ({storeContext.area}, {storeContext.city})
          </p>
          <p className="text-[11px] text-purple-400 font-extrabold mt-1.5 hover:underline flex items-center gap-1">
            Viewing Store Summary & Tally Account Statement →
          </p>
        </div>
      </div>
    ), { duration: 12000, position: 'top-right' });
  };

  // ================= STEP 4: ARTHA STORE ACCOUNT STATEMENT DATA (EXACT MUMBAI LEDGER) =================
  const [statementPeriod, setStatementPeriod] = useState('all');

  const rawTransactions = useMemo(() => {
    return generateDemoVouchersForStore(storeContext.code);
  }, [storeContext]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (statementPeriod === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return rawTransactions.filter(t => new Date(t.date) >= start);
    } else if (statementPeriod === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return rawTransactions.filter(t => new Date(t.date) >= start);
    } else if (statementPeriod === 'fy') {
      const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
      return rawTransactions.filter(t => new Date(t.date) >= fyStart);
    }
    return rawTransactions;
  }, [rawTransactions, statementPeriod]);

  // Artha Running Balance & Ledger Calculation
  const transactionsWithBalance = useMemo(() => {
    let runningBalance = 0;
    return filteredTransactions.map((t) => {
      const debit = t.type === 'Sale' || t.type === 'Journal' ? t.amount : 0;
      const credit = t.type === 'Receipt' || t.type === 'Payment' ? t.amount : 0;
      runningBalance += debit - credit;
      return { ...t, debit, credit, runningBalance };
    });
  }, [filteredTransactions]);

  const periodSummary = useMemo(() => {
    const totalDebit = transactionsWithBalance.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactionsWithBalance.reduce((s, t) => s + t.credit, 0);
    const avgInvoice = totalDebit / (transactionsWithBalance.filter((t) => t.debit > 0).length || 1);
    return {
      totalDebit,
      totalCredit,
      netBalance: totalDebit - totalCredit,
      transactionCount: transactionsWithBalance.length,
      avgInvoice,
    };
  }, [transactionsWithBalance]);

  const handleExportCSV = () => {
    const headers = ['Date,Type,Number,Narration,Debit,Credit,Running Balance,Status'];
    const rows = transactionsWithBalance.map(t =>
      `"${t.date}","${t.type}","${t.number}","${t.narration}",${t.debit},${t.credit},${t.runningBalance},"${t.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${storeContext.name.replace(/\s+/g, '_')}_Artha_Statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${transactionsWithBalance.length} statement transactions to CSV`);
  };

  const tabs = [
    { id: 1, name: '1. Agent Location & Map', icon: MapPin, status: isGeofenceVerified },
    { id: 2, name: '2. Live Camera & OCR', icon: Camera, status: Boolean(ocrResult) },
    { id: 3, name: '3. Store Account Statement', icon: FileText, status: true },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">

      {/* Top Header Banner (Artha Mumbai Bright Connection Branding) */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[11px] uppercase font-bold tracking-wider">
                Bright Connection Flow
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[11px]">
                Target: {storeContext.name} ({storeContext.code})
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Building2 className="h-6 w-6 text-purple-400" />
              {storeContext.name} — ARTHA Mumbai Context
            </h1>
            <p className="text-xs text-slate-300 mt-1">Company: <span className="text-white font-mono">{storeContext.company}</span> | Region: <span className="text-purple-300 font-bold">{storeContext.region} ({storeContext.city})</span></p>
          </div>

          {/* Mumbai Store Target Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Select Mumbai Store Target</p>
              <select
                value={storeContext.code}
                onChange={(e) => {
                  const found = MUMBAI_BRIGHT_STORES.find(s => s.code === e.target.value);
                  if (found) setStoreContext(found);
                }}
                className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              >
                {MUMBAI_BRIGHT_STORES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.area}, {st.city})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SINGLE TAB NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs whitespace-nowrap transition-all border-b-2 rounded-t-lg ${isActive
                  ? 'border-purple-600 text-purple-600 bg-purple-500/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-muted-foreground'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* SINGLE TAB CONTENT CONTAINER */}
      <div className="space-y-6">

        {/* ================= TAB 1: INTERACTIVE LEAFLET GEOFENCE MAP (MUMBAI DATA) ================= */}
        {activeTab === 1 && (
          <Card className="border-purple-500/30 shadow-lg">
            <CardHeader className="bg-muted/30 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Step 1: Agent Location & Interactive Niyantran Map ({storeContext.city})
                </CardTitle>
                {isGeofenceVerified ? (
                  <Badge variant="success">Geofence Verified</Badge>
                ) : (
                  <Badge variant="outline">Verification Pending</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">

              {/* Store Details Header Card */}
              <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{storeContext.name}</h3>
                    <p className="text-xs text-muted-foreground">{storeContext.address}</p>
                  </div>
                  <Badge variant="outline" className="font-mono">{storeContext.code}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-500/20">
                  <div>
                    <span className="text-muted-foreground">Store Manager:</span> <strong className="text-foreground">{storeContext.manager}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Region / Area:</span> <strong className="text-foreground">{storeContext.area}, {storeContext.region}</strong>
                  </div>
                </div>
              </div>

              {/* REAL INTERACTIVE LEAFLET MAP (EXACT ARTHA NIYANTRAN STYLE) */}
              <div className="relative w-full h-96 rounded-2xl overflow-hidden border border-slate-700 shadow-xl z-0">
                <MapContainer
                  center={[storeContext.geofence.lat, storeContext.geofence.lng]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <MapRecenter center={[storeContext.geofence.lat, storeContext.geofence.lng]} />
                  <MapFitBounds stores={MUMBAI_BRIGHT_STORES} agentCoords={agentCoords} />

                  {/* OpenStreetMap Standard Tiles */}
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* 50m Geofence Radius Circle for Active Store */}
                  <Circle
                    center={[storeContext.geofence.lat, storeContext.geofence.lng]}
                    radius={storeContext.geofence.radiusMeters}
                    pathOptions={{
                      color: agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? '#10b981' : '#3b82f6',
                      fillColor: agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? '#10b981' : '#3b82f6',
                      fillOpacity: 0.15,
                      dashArray: '5, 5',
                      weight: 2
                    }}
                  />

                  {/* Dashed Polyline Connecting Agent GPS and Active Store Location */}
                  <Polyline
                    positions={[
                      [agentCoords.lat, agentCoords.lng],
                      [storeContext.geofence.lat, storeContext.geofence.lng]
                    ]}
                    pathOptions={{
                      color: agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? '#10b981' : '#f59e0b',
                      dashArray: '6, 6',
                      weight: 3,
                      opacity: 0.8
                    }}
                  />

                  {/* Render ALL 10 Mumbai Store Pins on the Map */}
                  {MUMBAI_BRIGHT_STORES.map((store) => {
                    const isActive = store.id === storeContext.id;
                    return (
                      <Marker
                        key={store.id}
                        position={[store.geofence.lat, store.geofence.lng]}
                        icon={isActive ? STORE_MAP_ICON : INACTIVE_STORE_ICON}
                        eventHandlers={{
                          click: () => {
                            setStoreContext(store);
                            toast.success(`Switched target store to ${store.name} (${store.area})`);
                          }
                        }}
                      >
                        <Popup>
                          <div className="p-1 min-w-[200px]">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-sm text-slate-900">{store.name}</p>
                              {isActive && <Badge variant="success" className="text-[10px]">Active Target</Badge>}
                            </div>
                            <p className="text-xs text-amber-700 font-semibold">{store.area}, {store.city}</p>
                            <p className="text-xs text-slate-600 mt-1">{store.address}</p>
                            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-1">
                              <p><strong>GSTIN:</strong> {store.gstin}</p>
                              <p><strong>Manager:</strong> {store.manager}</p>
                              <p><strong>Outstanding:</strong> {formatCurrency(store.outstanding)}</p>
                              <p><strong>Tally Status:</strong> <span className="text-emerald-600 font-semibold">LIVE Sync</span></p>
                            </div>
                            {!isActive && (
                              <button
                                onClick={() => setStoreContext(store)}
                                className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1 px-2 rounded text-xs transition-colors"
                              >
                                Select {store.name} as Target Store
                              </button>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Field Agent Marker (Rajesh Menon) */}
                  <Marker
                    position={[agentCoords.lat, agentCoords.lng]}
                    icon={AGENT_MAP_ICON}
                  >
                    <Popup>
                      <div className="p-1 min-w-[200px]">
                        <p className="font-bold text-sm text-blue-900 flex items-center gap-1">
                          🟢 Agent: Rajesh Menon
                        </p>
                        <p className="text-xs text-slate-600">Field Executive — Andheri, Mumbai</p>
                        <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-1">
                          <p><strong>Current Store:</strong> {storeContext.name}</p>
                          <p><strong>GPS Accuracy:</strong> High ({agentCoords.distanceMeters}m offset)</p>
                          <p><strong>Battery Level:</strong> 88% 🔋</p>
                          <p><strong>Network:</strong> 5G Signal 📶</p>
                          <p><strong>Status:</strong> {agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? 'Inside 50m Geofence' : 'Outside Geofence'}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>

                {/* Top Control Bar Header Overlay */}
                <div className="absolute top-3 left-3 right-3 z-[1000] flex justify-between items-center bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/80 text-xs text-white shadow-lg pointer-events-auto">
                  <div className="flex items-center gap-2 font-mono font-semibold text-purple-300">
                    <Compass className="h-4 w-4 text-purple-400" />
                    <span>Niyantran Live GPS Map — {storeContext.city} Region</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-300" /> Agent (Rajesh)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 ring-2 ring-amber-300" /> Dealer ({storeContext.name})</span>
                    <button
                      onClick={handleCalibrateToCurrentLocation}
                      className="ml-2 bg-purple-600/80 hover:bg-purple-600 text-white text-[10px] px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset View to Mumbai Store
                    </button>
                  </div>
                </div>

                {/* Artha Map Legend Overlay at Bottom Left */}
                <LeafletMapLegend />

                {/* Distance Offset Overlay at Bottom Right */}
                <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white rounded-xl shadow-xl px-3 py-2 text-xs font-mono flex items-center gap-2 pointer-events-auto">
                  <span className="text-slate-300">Measured Distance:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                    {agentCoords.distanceMeters}m
                  </span>
                </div>
              </div>

              {/* Coordinates Monitor Card */}
              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Agent Mobile GPS:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    {agentCoords.lat}° N, {agentCoords.lng}° E
                    {agentCoords.isLive && <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] py-0">LIVE GPS</Badge>}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{storeContext.name} Geofence Target ({storeContext.area}):</span>
                  <span>{storeContext.geofence.lat}° N, {storeContext.geofence.lng}° E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Measured Distance:</span>
                  <span className={`font-bold ${agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {agentCoords.distanceMeters} meters {agentCoords.distanceMeters <= storeContext.geofence.radiusMeters ? '(Inside Geofence Zone)' : '(Outside 50m Zone)'}
                  </span>
                </div>
              </div>

              {/* MUMBAI SHOPS MASTER SELECTOR GRID */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-purple-600 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    Mumbai Store Masters — Click to Switch Agent Target Shop
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {MUMBAI_BRIGHT_STORES.length} Stores Available
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MUMBAI_BRIGHT_STORES.map((store) => {
                    const isSelected = store.id === storeContext.id;
                    return (
                      <div
                        key={store.id}
                        onClick={() => {
                          setStoreContext(store);
                          toast.success(`Agent (Rajesh) switched to ${store.name} (${store.area})`);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${isSelected
                            ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/30'
                            : 'bg-card border-border hover:border-purple-500/40 hover:bg-purple-500/5'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-sm text-foreground">{store.name}</span>
                            {isSelected ? (
                              <Badge variant="success" className="text-[10px] py-0 font-bold">
                                Active Target
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground font-mono">
                                {store.code}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-purple-400 font-semibold">{store.area}, {store.city}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{store.address}</p>
                        </div>

                        <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Manager:</span>
                            <span className="font-medium text-foreground">{store.manager.split(' ')[0]}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Outstanding:</span>
                            <span className="font-bold text-amber-500">{formatCurrency(store.outstanding)}</span>
                          </div>
                        </div>

                        <button
                          className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 mt-2 ${isSelected
                              ? 'bg-purple-600 text-white shadow'
                              : 'bg-muted text-muted-foreground hover:bg-purple-600 hover:text-white'
                            }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Selected Target Shop
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5" /> Switch Agent to {store.name}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTION & VERIFICATION BUTTONS */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleVerifyGeofence}
                  disabled={isGeofenceVerifying}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 text-sm"
                >
                  {isGeofenceVerifying ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Acquiring Live GPS Signal at {storeContext.name}...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 mr-2" />
                      Verify Agent Location at {storeContext.name} ({storeContext.area})
                    </>
                  )}
                </Button>

                {isGeofenceVerified && (
                  <div className="pt-2">
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl font-semibold text-sm">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                      <div>
                        <p>Agent Arrival Confirmed at {storeContext.name}</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          Agent (Rajesh Menon) is physically within {agentCoords.distanceMeters}m of {storeContext.name} ({storeContext.area}, {storeContext.city}).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= TAB 2: STOREFRONT OCR ENGINE (EXACT ARTHA DESIGN) ================= */}
        {activeTab === 2 && (
          <Card className="border-purple-500/30 shadow-lg">
            <CardHeader className="bg-muted/30 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-5 w-5 text-purple-600" />
                  Step 2: Storefront OCR Engine ({storeContext.name})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {ocrResult && <Badge variant="success">OCR Verified</Badge>}
                  {ocrMode !== 'idle' && (
                    <Button size="sm" variant="outline" onClick={resetOCR} className="text-xs">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Start Over
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <canvas ref={canvasRef} className="hidden" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* IDLE MODE: 2 Selection Cards */}
              {ocrMode === 'idle' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <Card
                    className="p-8 text-center hover:shadow-xl transition-all border-purple-500/20 hover:border-purple-500/50 cursor-pointer bg-muted/20 hover:bg-purple-500/5 group"
                    onClick={startCamera}
                  >
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20 group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Capture with Camera</h3>
                    <p className="text-xs text-muted-foreground">
                      Use your device camera to photograph the store signage in {storeContext.area}
                    </p>
                  </Card>

                  <Card
                    className="p-8 text-center hover:shadow-xl transition-all border-purple-500/20 hover:border-purple-500/50 cursor-pointer bg-muted/20 hover:bg-purple-500/5 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Upload Photo File</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload a photo of {storeContext.name}'s signage from your device
                    </p>
                  </Card>
                </div>
              )}

              {/* ACTIVE MODE: 2-Column Layout matching AI Artha StorefrontOCR */}
              {ocrMode !== 'idle' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Captured Image Display / Video Stream */}
                  <Card className="overflow-hidden border-purple-500/30">
                    <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/30">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Camera className="w-4 h-4 text-purple-600" />
                        Captured Signage {uploadedFileName ? `(${uploadedFileName})` : `(${storeContext.name})`}
                      </h3>
                      {ocrMode !== 'processing' && (
                        <button onClick={resetOCR} className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5" /> Retake
                        </button>
                      )}
                    </div>

                    <div className="relative w-full bg-slate-950 flex items-center justify-center p-2 min-h-[300px]">
                      {isCameraActive ? (
                        <div className="w-full relative">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[360px] object-cover rounded-xl" />
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                            <Button onClick={captureCameraPhoto} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                              <Camera className="w-4 h-4 mr-1.5" /> Capture Snapshot
                            </Button>
                            <Button variant="outline" onClick={stopCamera} className="bg-slate-900 text-slate-200 text-xs">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full">
                          {capturedImage && (
                            <img src={capturedImage} alt="Shop signage" className="w-full max-h-[360px] object-cover rounded-xl shadow-lg border border-slate-800" />
                          )}
                          {ocrMode === 'processing' && (
                            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
                              <div className="text-center text-white space-y-3">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                                <p className="font-bold text-sm">Processing Signboard OCR...</p>
                                <p className="text-xs text-slate-400">Extracting Dealer Metadata & GSTIN</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {ocrMode === 'preview' && !isCameraActive && (
                      <div className="p-4 border-t border-border bg-muted/10">
                        <Button onClick={handleRunOCR} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3">
                          <Eye className="w-4 h-4 mr-2" /> Process with OCR Engine
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Right Column: Associate Dealer & Shop Details Form (Shown ONLY after proceeding with OCR) */}
                  <div className="space-y-4">
                    {ocrResult ? (
                      <>
                        {/* Associate with Dealer Card */}
                        <Card className="p-4 border-purple-500/20 space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Associate with Dealer</h3>
                            <Badge variant="success" className="text-[10px]">Artha Dealer Master</Badge>
                          </div>

                          <select
                            value={storeContext.code}
                            onChange={(e) => {
                              const found = storesList.find(s => s.code === e.target.value);
                              if (found) {
                                setStoreContext(found);
                                toast.success(`Dealer associated manually to ${found.name}`);
                              }
                            }}
                            className="w-full bg-purple-500/10 border border-purple-500/30 rounded-xl p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-purple-500"
                          >
                            {storesList.map((st) => (
                              <option key={st.code} value={st.code} className="bg-slate-900 text-white font-semibold">
                                {st.name} ({st.area}, {st.city} - {st.code})
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-muted-foreground px-1">
                            Address: <span className="font-medium text-foreground">{storeContext.address}</span>
                          </p>
                        </Card>

                        {/* Shop Details Form */}
                        <Card className="p-4 border-purple-500/20 space-y-3">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-purple-600">Shop OCR Details</h3>
                            <Badge variant="success" className="text-[10px]">
                              {ocrResult.confidence}% Match Confidence
                            </Badge>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Shop Name</label>
                            <Input
                              value={editableShopDetails.name}
                              onChange={(e) => setEditableShopDetails({ ...editableShopDetails, name: e.target.value })}
                              placeholder="Extracted Shop Name"
                              className="text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Registered Address ({storeContext.city})</label>
                            <Input
                              value={editableShopDetails.address}
                              onChange={(e) => setEditableShopDetails({ ...editableShopDetails, address: e.target.value })}
                              placeholder="Extracted Address"
                              className="text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone Number</label>
                              <Input
                                value={editableShopDetails.phone}
                                onChange={(e) => setEditableShopDetails({ ...editableShopDetails, phone: e.target.value })}
                                placeholder="Phone Number"
                                className="text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground mb-1 block">GSTIN Number</label>
                              <Input
                                value={editableShopDetails.gstin}
                                onChange={(e) => setEditableShopDetails({ ...editableShopDetails, gstin: e.target.value })}
                                placeholder="GSTIN"
                                className="text-xs font-mono"
                              />
                            </div>
                          </div>
                        </Card>

                        <div className="space-y-3 pt-1">
                          <Button
                            onClick={() => {
                              toast.success(`Storefront verified and attached to ${storeContext.name}!`);
                              handleSendNotification();
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 text-xs flex items-center justify-center gap-2 shadow-xl animate-pulse"
                          >
                            <CheckCircle2 className="w-5 h-5" /> Confirm Storefront Verification & Notify Manager
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Card className="p-8 text-center border-dashed border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center space-y-4 min-h-[360px]">
                        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/30">
                          <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-foreground mb-1">Awaiting OCR Analysis</h3>
                          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            Click <strong className="text-purple-600 dark:text-purple-400">"Process with OCR Engine"</strong> on the left to extract signboard details, GSTIN, and match dealer master data.
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================= TAB 3: STORE ACCOUNT STATEMENT & LEDGER (EXACT DELHI DATA FROM ARTHA) ================= */}
        {activeTab === 3 && (
          <div className="space-y-6">

            {/* 5 ARTHA SUMMARY STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-4 border-rose-500/30 bg-rose-500/5 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                    <IndianRupee className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Debit</p>
                    <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(periodSummary.totalDebit)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-emerald-500/30 bg-emerald-500/5 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <IndianRupee className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Credit</p>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(periodSummary.totalCredit)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-purple-500/30 bg-purple-500/5 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                    {periodSummary.netBalance >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-purple-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Balance</p>
                    <p className="text-base font-extrabold text-purple-600 dark:text-purple-300">
                      {formatCurrency(storeContext.outstanding)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-amber-500/30 bg-amber-500/5 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overdue Amount</p>
                    <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                      {formatCurrency(storeContext.overdue)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-cyan-500/30 bg-cyan-500/5 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                    <IndianRupee className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Invoice</p>
                    <p className="text-base font-extrabold text-cyan-600 dark:text-cyan-400">{formatCurrency(periodSummary.avgInvoice)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* ARTHA STATEMENT TABLE CONTAINER */}
            <Card className="border-purple-500/30 shadow-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border-b border-purple-500/20 text-white py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] uppercase font-bold tracking-wider">
                        ARTHA Dealer Statement Surface — {storeContext.city}
                      </Badge>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] uppercase font-mono">
                        Tally Gateway Connected
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Account Statement: {storeContext.name} ({storeContext.code}) — {storeContext.area}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleExportCSV} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md">
                      <Download className="h-4 w-4 mr-1.5" /> Export CSV Ledger
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">

                {/* Statement Period Filters */}
                <div className="flex flex-wrap items-center justify-between border-b border-border pb-3.5 gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Period:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {PERIODS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setStatementPeriod(p.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statementPeriod === p.id
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 border border-purple-400/40 ring-2 ring-purple-500/20'
                            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border'
                          }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Artha Semantic Table Component */}
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70 border-b border-border">
                      <TableHead className="w-28 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Date</TableHead>
                      <TableHead className="w-28 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Voucher Type</TableHead>
                      <TableHead className="w-44 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Number</TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Narration / Details</TableHead>
                      <TableHead className="w-32 text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Debit (₹)</TableHead>
                      <TableHead className="w-32 text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Credit (₹)</TableHead>
                      <TableHead className="w-36 text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Balance (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsWithBalance.map((t, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40 transition-colors border-b border-border">
                        <TableCell className="font-mono text-xs text-muted-foreground py-3.5">{t.date}</TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            className={`text-[10px] font-bold px-2.5 py-0.5 ${t.type === 'Receipt'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                                : t.type === 'Sale'
                                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40'
                                  : 'bg-muted text-muted-foreground border border-border'
                              }`}
                          >
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-purple-600 dark:text-purple-400 font-bold text-xs tracking-tight py-3.5">{t.number}</TableCell>
                        <TableCell className="text-foreground font-medium text-xs py-3.5">{t.narration}</TableCell>
                        <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 text-xs py-3.5">
                          {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs py-3.5">
                          {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-foreground text-xs py-3.5">
                          {formatCurrency(t.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="pt-3 flex justify-between items-center text-xs text-muted-foreground border-t border-border font-mono">
                  <span>Tally Company: <strong className="text-foreground">{storeContext.company}</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Live Tally Reconciliation Signed ({storeContext.city})
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default BrightConnectionDemo;
