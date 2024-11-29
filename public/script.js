// Menyimpan alarm untuk setiap laci
let alarmsA = [];
let alarmsB = [];
let alarmsC = [];

// Base URL untuk API
const API_BASE_URL = 'https://medicine-reminder-web-production.up.railway.app';

// Fungsi untuk menambah alarm
function addAlarm(laci) {
    const timeInput = document.getElementById(`time${laci}`);
    const time = timeInput.value;
    
    if (!time) {
        alert('Silakan pilih waktu terlebih dahulu');
        return;
    }
    
    const [hours, minutes] = time.split(':');
    const alarmData = {
        hour: parseInt(hours),
        minute: parseInt(minutes)
    };
    
    // Tambahkan ke array yang sesuai
    switch(laci) {
        case 'A':
            alarmsA.push(alarmData);
            break;
        case 'B':
            alarmsB.push(alarmData);
            break;
        case 'C':
            alarmsC.push(alarmData);
            break;
    }
    
    // Update tampilan dan server
    updateAlarmList(laci);
    updateServer();
    
    // Reset input
    timeInput.value = '';
}

// Fungsi untuk menghapus alarm
function deleteAlarm(laci, index) {
    switch(laci) {
        case 'A':
            alarmsA.splice(index, 1);
            break;
        case 'B':
            alarmsB.splice(index, 1);
            break;
        case 'C':
            alarmsC.splice(index, 1);
            break;
    }
    
    // Update tampilan dan server
    updateAlarmList(laci);
    updateServer();
}

// Fungsi untuk memperbarui tampilan daftar alarm
function updateAlarmList(laci) {
    const alarmList = document.getElementById(`alarmList${laci}`);
    let alarms;
    let btnClass;
    
    switch(laci) {
        case 'A':
            alarms = alarmsA;
            btnClass = 'btn-primary';
            break;
        case 'B':
            alarms = alarmsB;
            btnClass = 'btn-success';
            break;
        case 'C':
            alarms = alarmsC;
            btnClass = 'btn-info';
            break;
    }
    
    alarmList.innerHTML = '';
    
    // Urutkan alarm berdasarkan waktu
    alarms.sort((a, b) => {
        if (a.hour === b.hour) {
            return a.minute - b.minute;
        }
        return a.hour - b.hour;
    });
    
    alarms.forEach((alarm, index) => {
        const alarmDiv = document.createElement('div');
        alarmDiv.className = 'alarm-item';
        
        const timeString = `${alarm.hour.toString().padStart(2, '0')}:${alarm.minute.toString().padStart(2, '0')}`;
        
        alarmDiv.innerHTML = `
            <span class="alarm-time">${timeString}</span>
            <button class="btn ${btnClass} btn-sm btn-delete" onclick="deleteAlarm('${laci}', ${index})">
                <i class="fas fa-trash"></i> Hapus
            </button>
        `;
        
        alarmList.appendChild(alarmDiv);
    });
}

// Fungsi untuk memperbarui server
async function updateServer() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/alarms`, {
            method: 'POST',
            body: JSON.stringify({
                laciA: alarmsA,
                laciB: alarmsB,
                laciC: alarmsC
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Server updated successfully:', data);
    } catch (error) {
        console.error('Error updating server:', error);
        alert('Gagal memperbarui server. Silakan coba lagi.');
    }
}

// Fungsi untuk mengambil data dari server
async function fetchAlarms() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/alarms`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched alarms:', data);
        
        alarmsA = data.laciA || [];
        alarmsB = data.laciB || [];
        alarmsC = data.laciC || [];
        
        // Update tampilan
        updateAlarmList('A');
        updateAlarmList('B');
        updateAlarmList('C');
    } catch (error) {
        console.error('Error fetching alarms:', error);
        alert('Gagal mengambil data dari server. Silakan muat ulang halaman.');
    }
}

// Fungsi untuk memformat waktu
function formatTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Fungsi untuk mendapatkan waktu WIB dari server
async function getServerTime() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/time`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Server time:', data);
        return data;
    } catch (error) {
        console.error('Error fetching server time:', error);
        return null;
    }
}

// Update waktu setiap detik
async function updateCurrentTime() {
    const timeDisplay = document.getElementById('currentTime');
    if (!timeDisplay) return;

    const time = await getServerTime();
    if (time) {
        timeDisplay.textContent = `Waktu WIB: ${formatTime(time.hour, time.minute)}`;
    }
}

// Update waktu setiap 30 detik
setInterval(updateCurrentTime, 30000);

// Ambil data saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    fetchAlarms();
    updateCurrentTime();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Add authentication headers to fetch
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Add logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}
