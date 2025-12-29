// RoadGuard - script.js
// Minimal JS: theme toggle, geolocation placeholder, SOS and UI interactions

(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const sosBtn = document.getElementById('sos-btn');
  const enableLocationBtn = document.getElementById('enable-location');
  const getHelpBtn = document.getElementById('get-help');
  const sendOtpBtn = document.getElementById('send-otp');

  // Restore theme
  const theme = localStorage.getItem('roadguard-theme');
  if(theme === 'light') root.classList.add('light');

  themeToggle?.addEventListener('click', () => {
    root.classList.toggle('light');
    const mode = root.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('roadguard-theme', mode);
  });

  // Store last-known location (not sent anywhere) — UI placeholder
  let lastLocation = null;
  function onLocationSuccess(pos){
    lastLocation = {lat: pos.coords.latitude, lon: pos.coords.longitude};
    alert('Live location enabled — coordinates saved for UI: ' + lastLocation.lat.toFixed(4) + ', ' + lastLocation.lon.toFixed(4));
  }
  function onLocationError(err){
    alert('Unable to get location: ' + (err.message || err.code));
  }

  enableLocationBtn?.addEventListener('click', () => {
    if(!navigator.geolocation){
      alert('Geolocation not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {enableHighAccuracy:true, timeout:10000});
  });

  // SOS quick call — confirm then dial emergency contact
  sosBtn?.addEventListener('click', () => {
    const ok = confirm('Request immediate help from RoadGuard emergency line?');
    if(ok){
      // Simple behavior for demo: initiate a call
      window.location.href = 'tel:+911234567890';
    }
  });

  // Get Help Now button — simulate request
  getHelpBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if(lastLocation){
      alert('Help requested. Nearest mechanic will be dispatched to: ' + lastLocation.lat.toFixed(4) + ', ' + lastLocation.lon.toFixed(4));
    } else {
      const tryEnable = confirm('Live location not enabled. Enable now?');
      if(tryEnable){
        enableLocationBtn.click();
      } else {
        alert('You can call our emergency line: +91 12345 67890');
      }
    }
  });

  // Send OTP (UI only)
  sendOtpBtn?.addEventListener('click', () => {
    const mobile = document.getElementById('mobile')?.value || '';
    const cleaned = mobile.replace(/\D/g, '');
    if(cleaned.length !== 10){
      alert('Please enter a valid 10-digit mobile number (UI placeholder).');
      return;
    }
    alert('OTP sent (UI placeholder) to +' + cleaned);
  });

  // Accessibility: add keyboard handler for Enter on SOS
  sosBtn?.addEventListener('keyup', (e) => { if(e.key === 'Enter') sosBtn.click(); });

})();
(function(){
  // Selectors for UI elements
  const S = {
    loginBtn: '#loginBtn', ctaHelp: '#ctaHelp', ctaBrowse: '#ctaBrowse',
    loginModal: '#loginModal', closeLogin: '#closeLogin', phone: '#phone', sendOtp: '#sendOtp', verifyOtp: '#verifyOtp', otpRow: '#otpRow', otpInput: '#otp',
    serviceCard: '.service-card',
    sosBtn: '#sosBtn', sosPanel: '#sosPanel', closeSos: '#closeSos', allowLocForSos: '#allowLocForSos', sosPolice: '#sosPolice', sosHospitals: '#sosHospitals'
  };

  // Small app state persisted to localStorage for demo
  const state = {
    loggedIn: false,
    phone: null,
    coords: null
  };

  // helper to select single element
  const $ = sel => document.querySelector(sel);

  // Initialize event listeners and state
  function init(){
    // restore demo auth state
    const stored = localStorage.getItem('rg_user');
    if(stored){
      try{const u=JSON.parse(stored);state.loggedIn=!!u.phone;state.phone=u.phone}catch(e){}
    }

    // bind UI
    $(S.loginBtn).addEventListener('click', onLoginClick);
    $(S.sendOtp).addEventListener('click', sendOtp);
    $(S.verifyOtp).addEventListener('click', verifyOtp);
    $(S.closeLogin).addEventListener('click', ()=>setModal(false));
    $(S.ctaHelp).addEventListener('click', ()=>onRequestService('refuel'));
    $(S.ctaBrowse).addEventListener('click', ()=>scrollToSection('.services'));
    document.querySelectorAll(S.serviceCard).forEach(btn=>btn.addEventListener('click', ()=>onRequestService(btn.dataset.service)));

    // SOS bindings
    $(S.sosBtn).addEventListener('click', toggleSos);
    $(S.closeSos).addEventListener('click', ()=>setSos(false));
    $(S.allowLocForSos).addEventListener('click', ()=>{
      requestLocation().then(()=>populateSosLists()).catch(()=>{});
    });

    updateUi();
  }

  // Show/hide login modal
  function setModal(show){
    const m = $(S.loginModal);
    m.setAttribute('aria-hidden', show? 'false':'true');
    if(show) $(S.phone).focus();
  }

  // Entry from navbar login button
  function onLoginClick(){
    if(state.loggedIn){ // logout
      localStorage.removeItem('rg_user');
      state.loggedIn=false;state.phone=null;updateUi();
      alert('You have been logged out (demo).');
      return;
    }
    setModal(true);
  }

  // Simulate sending OTP (demo). Shows OTP input UI.
  function sendOtp(){
    const phone = $(S.phone).value.trim();
    if(!/^\+?\d{9,15}$/.test(phone)){
      alert('Enter a valid mobile number including country code (e.g. +919876543210).');
      return;
    }
    // show OTP row and show verify button
    document.querySelector(S.otpRow).style.display='block';
    $(S.verifyOtp).style.display='inline-block';
    $(S.sendOtp).textContent='Resend OTP';
    // In production: trigger backend SMS here. Demo: OTP is 123456
    alert('Demo OTP sent: 123456');
  }

  // Verify OTP (demo: 123456)
  function verifyOtp(){
    const code = $(S.otpInput).value.trim();
    if(code === '123456'){
      const phone = $(S.phone).value.trim();
      state.loggedIn=true; state.phone=phone;
      localStorage.setItem('rg_user', JSON.stringify({phone}));
      setModal(false);
      updateUi();
      // ask for location immediately to speed up service
      requestLocation().catch(()=>{});
      alert('Login successful (demo).');
    }else{
      alert('Invalid OTP. Demo OTP is 123456.');
    }
  }

  // Update visible UI based on auth/coords
  function updateUi(){
    $(S.loginBtn).textContent = state.loggedIn? 'Logout':'Login';
  }

  // Smooth scroll to a section
  function scrollToSection(sel){
    const el = document.querySelector(sel);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  // Request geolocation; returns a Promise that resolves when coords are set or rejects on error.
  function requestLocation(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){
        alert('Geolocation not supported by your browser.');
        return reject(new Error('unsupported'));
      }
      navigator.geolocation.getCurrentPosition(pos=>{
        state.coords = {latitude: pos.coords.latitude, longitude: pos.coords.longitude};
        resolve(state.coords);
      }, err=>{
        alert('Location permission denied or unavailable. Services require location to dispatch help.');
        reject(err);
      }, {enableHighAccuracy:true, timeout:15000});
    });
  }

  // Core: when user taps a service card or CTA
  async function onRequestService(service){
    // 1. Allow browsing without login
    if(!state.loggedIn){
      // prompt to login (simulate native India UX: quick modal)
      setModal(true);
      return;
    }

    // 2. require location
    if(!state.coords){
      try{ await requestLocation(); }
      catch(e){ return; /* blocked */ }
    }

    // 3. proceed to request (demo: show confirmation)
    const confirmMsg = `Requesting ${niceName(service)} near (${state.coords.latitude.toFixed(4)}, ${state.coords.longitude.toFixed(4)}). Continue?`;
    if(confirm(confirmMsg)){
      // In real app: send request to backend. Demo: acknowledge.
      alert(`Your request for ${niceName(service)} has been placed. A nearby mechanic will contact you.`);
    }
  }

  function niceName(k){
    return ({refuel:'Emergency Refuel',tyre:'Flat Tyre Repair',battery:'Battery Jump-start',tow:'Towing Service'})[k]||k;
  }

  // SOS panel handling
  function toggleSos(){
    const panel = $(S.sosPanel);
    const visible = panel.getAttribute('aria-hidden') === 'false';
    setSos(!visible);
    if(!visible){ // now opening
      if(state.coords) populateSosLists();
    }
  }
  function setSos(show){
    $(S.sosPanel).setAttribute('aria-hidden', show? 'false':'true');
  }

  // Populate SOS nearby links using Google Maps search queries
  function populateSosLists(){
    if(!state.coords){
      $(S.sosPolice).innerHTML = '<li class="placeholder">Location not available</li>';
      $(S.sosHospitals).innerHTML = '<li class="placeholder">Location not available</li>';
      return;
    }
    const lat = state.coords.latitude.toFixed(6);
    const lon = state.coords.longitude.toFixed(6);
    // Google Maps search links for nearby police and hospitals
    const policeLink = `https://www.google.com/maps/search/?api=1&query=police+near+${lat},${lon}`;
    const hospLink = `https://www.google.com/maps/search/?api=1&query=hospital+near+${lat},${lon}`;

    $(S.sosPolice).innerHTML = `<li><a href="${policeLink}" target="_blank" rel="noopener">Open nearby police stations in Google Maps</a></li>`;
    $(S.sosHospitals).innerHTML = `<li><a href="${hospLink}" target="_blank" rel="noopener">Open nearby hospitals in Google Maps</a></li>`;
  }

  // boot
  document.addEventListener('DOMContentLoaded', init);
})();
