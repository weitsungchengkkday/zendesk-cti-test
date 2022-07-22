
$(function () {
    const speakerDevices = document.getElementById("speaker-devices");
    const ringtoneDevices = document.getElementById("ringtone-devices");
    const outputVolumeBar = document.getElementById("output-volume");
    const inputVolumeBar = document.getElementById("input-volume");
    const volumeIndicators = document.getElementById("volume-indicators");
    const callButton = document.getElementById("button-call");
    const outgoingCallHangupButton = document.getElementById("button-hangup-outgoing");
    const callControlsDiv = document.getElementById("call-controls");
    const audioSelectionDiv = document.getElementById("output-selection");
    const getAudioDevicesButton = document.getElementById("get-devices");
    const logDiv = document.getElementById("log");
    const incomingCallDiv = document.getElementById("incoming-call");
    const incomingCallHangupButton = document.getElementById(
      "button-hangup-incoming"
    );
    const incomingCallAcceptButton = document.getElementById(
      "button-accept-incoming"
    );
    const incomingCallRejectButton = document.getElementById(
      "button-reject-incoming"
    );
    const phoneNumberInput = document.getElementById("phone-number");
    const incomingPhoneNumberEl = document.getElementById("incoming-number");
    const startupButton = document.getElementById("startup-button");

    const startupWorkerButton = document.getElementById("startup-worker");
  
    // twilio taskrouter worker status
    const activityIdle = document.getElementById("worker-activity-idle");
    const activityBusy = document.getElementById("worker-activity-busy");
    const activityOffline = document.getElementById("worker-activity-offline");
    const activityReserved = document.getElementById("worker-activity-reserved");

    let device;
    let zendesk_user;
    let worker;

    // {
    //   worker_id = ""
    //   worker_activity_id = ""
    // }

    // Zendesk 

    // Zendesk Client 物件
    var client = ZAFClient.init();

    // Zendesk iFrame resize (限定只能用 px, %, or vw/vh)
    client.invoke('resize', { width: '800px', height: '400px' });

    // Zendesk 彈出匡大小
    client.invoke('popover', { width: 800, height: 400 }, )

    // 取得當前的 Zendesk User 
    client.get('currentUser')
      .then(function (data) {
        zendesk_user = data['currentUser']
      // console.log(zendesk_user)
      })

    // Event Listeners
  
    callButton.onclick = (e) => {
      e.preventDefault();
      makeOutgoingCall();
    };

    getAudioDevicesButton.onclick = getAudioDevices;
    speakerDevices.addEventListener("change", updateOutputDevice);
    ringtoneDevices.addEventListener("change", updateRingtoneDevice);

    
    activityIdle.addEventListener("click", function(){
      updateWorkerActivity(activityIdle.value)
    });
    activityBusy.addEventListener("click", function(){
      updateWorkerActivity(activityBusy.value)
    });
    activityOffline.addEventListener("click", function(){
      updateWorkerActivity(activityOffline.value)
    });
    activityReserved.addEventListener("click", function(){
      updateWorkerActivity(activityReserved.value)
    });
    
  
    // SETUP STEP 1:
    // Browser client should be started after a user gesture
    // to avoid errors in the browser console re: AudioContext
    startupButton.addEventListener("click", startupClient);
    startupWorkerButton.addEventListener("click", startupWorker)
  
    // SETUP STEP 2: Request an Access Token
    async function startupClient() {
      log("Requesting Access Token...");
  
      try {

        let zendesk_user_email
        if (zendesk_user) {
            zendesk_user_email = zendesk_user.email
            console.log(zendesk_user.id)
        }
       
        const data = await $.getJSON(`https://cti-service-zendesk-7936-dev.twil.io/access-token?zendesk_user_email=${zendesk_user_email}`);
        log("Got a token.");
        let token = data.token;
        log(`TOKEN: ${token}`);
        setClientNameUI(data.identity);
        intitializeDevice(token);

      } catch (err) {
        console.log(err);
        log("An error occurred. See your browser console for more information.");

      }
    }
  
    // SETUP STEP 3:
    // Instantiate a new Twilio.Device
    function intitializeDevice(token) {
      logDiv.classList.remove("hide");
      log("Initializing device");
      device = new Twilio.Device(token, {
        logLevel:1,
        // Set Opus as our preferred codec. Opus generally performs better, requiring less bandwidth and
        // providing better audio quality in restrained network conditions.
        codecPreferences: ["opus", "pcmu"],
      });
  
      addDeviceListeners(device);
  
      // Device must be registered in order to receive incoming calls
      device.register();
    }
  
    // SETUP STEP 4:
    // Listen for Twilio.Device states
    function addDeviceListeners(device) {
      device.on("registered", function () {
        log("Twilio.Device Ready to make and receive calls!");
        callControlsDiv.classList.remove("hide");
      });
  
      device.on("error", function (error) {
        log("Twilio.Device Error: " + error.message);
      });
  
      device.on("incoming", handleIncomingCall);
  
      device.audio.on("deviceChange", updateAllAudioDevices.bind(device));
  
      // Show audio selection UI if it is supported by the browser.
      if (device.audio.isOutputSelectionSupported) {
        audioSelectionDiv.classList.remove("hide");
      }
    }
  
    // MAKE AN OUTGOING CALL
  
    async function makeOutgoingCall() {
      var params = {
        // get the phone number to call from the DOM
        To: phoneNumberInput.value,
      };
  
      if (device) {
        log(`Attempting to call ${params.To} ...`);
  
        // Twilio.Device.connect() returns a Call object
        const call = await device.connect({ params });
  
        // add listeners to the Call
        // "accepted" means the call has finished connecting and the state is now "open"
        call.on("accept", updateUIAcceptedOutgoingCall);
        call.on("disconnect", updateUIDisconnectedOutgoingCall);
        call.on("cancel", updateUIDisconnectedOutgoingCall);
  
        outgoingCallHangupButton.onclick = () => {
          log("Hanging up ...");
          call.disconnect();
        };
  
      } else {
        log("Unable to make call.");
      }
    }
  
    function updateUIAcceptedOutgoingCall(call) {
      log("Call in progress ...");
      callButton.disabled = true;
      outgoingCallHangupButton.classList.remove("hide");
      volumeIndicators.classList.remove("hide");
      bindVolumeIndicators(call);
    }
  
    function updateUIDisconnectedOutgoingCall() {
      log("Call disconnected.");
      callButton.disabled = false;
      outgoingCallHangupButton.classList.add("hide");
      volumeIndicators.classList.add("hide");
    }
  
    // HANDLE INCOMING CALL
  
    function handleIncomingCall(call) {
      log(`Incoming call from ${call.parameters.From}`);
      console.log("Call", call)
  
      //show incoming call div and incoming phone number
      incomingCallDiv.classList.remove("hide");
      incomingPhoneNumberEl.innerHTML = call.parameters.From;
  
      //add event listeners for Accept, Reject, and Hangup buttons
      incomingCallAcceptButton.onclick = () => {
        acceptIncomingCall(call);
      };
  
      incomingCallRejectButton.onclick = () => {
        rejectIncomingCall(call);
      };
  
      incomingCallHangupButton.onclick = () => {
        hangupIncomingCall(call);
      };
  
      // Add event listener to call object
      call.on("cancel", handleDisconnectedIncomingCall);
      call.on("disconnect", handleDisconnectedIncomingCall);
      call.on("reject", handleDisconnectedIncomingCall);
    }
  
    // ACCEPT INCOMING CALL
  
    function acceptIncomingCall(call) {
      call.accept();
  
      //update UI
      log("Accepted incoming call.");
      incomingCallAcceptButton.classList.add("hide");
      incomingCallRejectButton.classList.add("hide");
      incomingCallHangupButton.classList.remove("hide");
    }
  
    // REJECT INCOMING CALL
  
    function rejectIncomingCall(call) {
      call.reject();
      log("Rejected incoming call");
      resetIncomingCallUI();
    }
  
    // HANG UP INCOMING CALL
  
    function hangupIncomingCall(call) {
      call.disconnect();
      log("Hanging up incoming call");
      resetIncomingCallUI();
    }
  
    // HANDLE CANCELLED INCOMING CALL
  
    function handleDisconnectedIncomingCall() {
      log("Incoming call ended.");
      resetIncomingCallUI();
    }
  
    // MISC USER INTERFACE
  
    // Activity log
    function log(message) {
      logDiv.innerHTML += `<p class="log-entry">&gt;&nbsp; ${message} </p>`;
      logDiv.scrollTop = logDiv.scrollHeight;
    }
  
    function setClientNameUI(clientName) {
      var div = document.getElementById("client-name");
      div.innerHTML = `Your client name: <strong>${clientName}</strong>`;
    }
  
    function resetIncomingCallUI() {
      incomingPhoneNumberEl.innerHTML = "";
      incomingCallAcceptButton.classList.remove("hide");
      incomingCallRejectButton.classList.remove("hide");
      incomingCallHangupButton.classList.add("hide");
      incomingCallDiv.classList.add("hide");
    }
  
    // AUDIO CONTROLS
  
    async function getAudioDevices() {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      updateAllAudioDevices.bind(device);
    }
  
    function updateAllAudioDevices() {
      if (device) {
        updateDevices(speakerDevices, device.audio.speakerDevices.get());
        updateDevices(ringtoneDevices, device.audio.ringtoneDevices.get());
      }
    }
  
    function updateOutputDevice() {
      const selectedDevices = Array.from(speakerDevices.children)
        .filter((node) => node.selected)
        .map((node) => node.getAttribute("data-id"));
  
      device.audio.speakerDevices.set(selectedDevices);
    }
  
    function updateRingtoneDevice() {
      const selectedDevices = Array.from(ringtoneDevices.children)
        .filter((node) => node.selected)
        .map((node) => node.getAttribute("data-id"));
  
      device.audio.ringtoneDevices.set(selectedDevices);
    }
  
    function bindVolumeIndicators(call) {
      call.on("volume", function (inputVolume, outputVolume) {
        var inputColor = "red";
        if (inputVolume < 0.5) {
          inputColor = "green";
        } else if (inputVolume < 0.75) {
          inputColor = "yellow";
        }
  
        inputVolumeBar.style.width = Math.floor(inputVolume * 300) + "px";
        inputVolumeBar.style.background = inputColor;
  
        var outputColor = "red";
        if (outputVolume < 0.5) {
          outputColor = "green";
        } else if (outputVolume < 0.75) {
          outputColor = "yellow";
        }
  
        outputVolumeBar.style.width = Math.floor(outputVolume * 300) + "px";
        outputVolumeBar.style.background = outputColor;
      });
    }
  
    // Update the available ringtone and speaker devices
    function updateDevices(selectEl, selectedDevices) {
      selectEl.innerHTML = "";
  
      device.audio.availableOutputDevices.forEach(function (device, id) {
        var isActive = selectedDevices.size === 0 && id === "default";
        selectedDevices.forEach(function (device) {
          if (device.deviceId === id) {
            isActive = true;
          }
        });
  
        var option = document.createElement("option");
        option.label = device.label;
        option.setAttribute("data-id", id);
        if (isActive) {
          option.setAttribute("selected", "selected");
        }
        selectEl.appendChild(option);
      });
    }

    async function startupWorker() {
      
      log("Requesting worker token")
      
      try {

        let zendesk_user_email 
        if (zendesk_user) {
            zendesk_user_email = zendesk_user.email
        }
       
        const data = await $.post(`https://cti-service-zendesk-7936-dev.twil.io/taskrouter_worker_token?worker_email=${zendesk_user_email}`);
        let token = data.token;
        log(`Worker TOKEN: ${token}`);

        worker = new Twilio.TaskRouter.Worker(token)
        console.log(worker)
        log(`Got a worker: ${worker}`);
        
        // Add event on worker

        worker.on("ready", function(worker) {
          console.log("worker.available", worker.available)       // true
        });

        addWorkerEvent()

      } catch (err) {
        console.log(err);
        log("An error occurred. See your browser console for more information.");
      }

    }

    function addWorkerEvent() {

      worker.on("ready", function(worker) {
        console.log("worker.sid", worker.sid)             // 'WKxxx'
        console.log("worker.friendlyName", worker.friendlyName)   // 'Worker 1'
        console.log("worker.activityName", worker.activityName)   // 'Reserved'
        console.log("worker.available", worker.available)       // false
      });

      worker.on("activity.update", function(worker) {
        console.log("worker.sid", worker.sid)             // 'WKxxx'
        console.log("worker.friendlyName", worker.friendlyName)   // 'Worker 1'
        console.log("worker.activityName", worker.activityName)   // 'Reserved'
        console.log("worker.available", worker.available)       // false
      });
    }

    async function updateWorkerActivity(activity) {

      let sid
  
      switch (activity) {
        case "Idle":
          sid = "WA9ee5618a66402f9aa210711798c75035"
          break
        case "Busy":
          sid = "WA9b169b3805880c2ba14639bdfa781219"
          break
        case "Offline":
          sid = "WAd1ddd200d6a0c9b896b252f299b30dbb"
          break
        case "Reserved":
          sid = "WAc2bb5f0fdaa260f3b36c438001301156"
          break
        default: 
          return
      }
      
      await worker.update("ActivitySid", sid, function(error, worker) {
        if(error) {
          console.log(error.code);
          console.log(error.message);
        } else {
          console.log(worker.activityName);
        }
      });
    }

  });
  