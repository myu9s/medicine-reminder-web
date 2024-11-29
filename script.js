// Menyimpan alarm untuk setiap laci
let alarmsA = [];
let alarmsB = [];
let alarmsC = [];

// API URL
const API_URL = 'http://your-server-url/api/alarms';

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
    
    switch(laci) {
        case 'A':
            alarms = alarmsA;
            break;
        case 'B':
            alarms = alarmsB;
            break;
        case 'C':
            alarms = alarmsC;
            break;
    }
    
    alarmList.innerHTML = '';
    
    alarms.forEach((alarm, index) => {
        const alarmDiv = document.createElement('div');
        alarmDiv.className = 'alarm-item';
        
        const timeString = `${alarm.hour.toString().padStart(2, '0')}:${alarm.minute.toString().padStart(2, '0')}`;
        
        alarmDiv.innerHTML = `
            <span>${timeString}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteAlarm('${laci}', ${index})">Hapus</button>
        `;
        
        alarmList.appendChild(alarmDiv);
    });
}

// Fungsi untuk memperbarui server
async function updateServer() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                laciA: alarmsA,
                laciB: alarmsB,
                laciC: alarmsC
            })
        });
        
        if (!response.ok) {
            throw new Error('Gagal memperbarui server');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal memperbarui server. Silakan coba lagi.');
    }
}

// Fungsi untuk mengambil data dari server
async function fetchAlarms() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Gagal mengambil data dari server');
        }
        
        const data = await response.json();
        alarmsA = data.laciA || [];
        alarmsB = data.laciB || [];
        alarmsC = data.laciC || [];
        
        // Update tampilan
        updateAlarmList('A');
        updateAlarmList('B');
        updateAlarmList('C');
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal mengambil data dari server. Silakan muat ulang halaman.');
    }
}

// Ambil data saat halaman dimuat
document.addEventListener('DOMContentLoaded', fetchAlarms);
