// Connect to the server
const url = new URL(window.location)
const ws = new WebSocket(`ws://${url.host}`)

// Variable to track if there is a pending scroll update
let hasPendingScrollUpdate = false;

// Connected state
let connected = false

// Enabled modules
let enabledModules = {
  inputs: false,
  scroll: false,
  whiteboard: false
}

let imgUpdated = false
let imgUpdating = false
let imgUpdatingBuffer = []

// Whiteboard variables
let ctx_whiteboard, isDrawing_whiteboard, isErasing_whiteboard, lastX_whiteboard, lastY_whiteboard

// append the current URL to outgoing messages
function sendMessage(message) {
  message.url = url.href
  ws.send(JSON.stringify(message))
}

// Debounce function to limit the frequency of scroll updates
function debounce(func, wait) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Listen for 'connect' event
ws.addEventListener('open', function(event) {
  console.log('Connected to server')
  connected = true
  document.querySelectorAll('textarea').forEach((textarea) => {
    textarea.addEventListener('change', sendHtmlUpdate);
  });

  document.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', sendHtmlUpdate);
  });

  var btns = 0;

  document.querySelectorAll('input').forEach((input) => {
    if (input.getAttribute('type') === 'button' || input.getAttribute('type') === 'submit') {
      input.addEventListener('click', sendButtonClickUpdate);
      input.setAttribute('data-btn',btns);
      btns++;
    }else{
      input.addEventListener('change', sendHtmlUpdate);
    }
  });

  document.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', sendButtonClickUpdate);
    button.setAttribute('data-btn',btns);
    btns++;
  });
})

// Listen for 'message' event
ws.addEventListener('message', function(event) {
  let data = event.data
  try {
    let updatedData = JSON.parse(data)
    if(updatedData[url.href]) {
      if(updatedData[url.href].redirect) {
        window.location.href = updatedData[url.href].redirectUrl
      }
    }
    if(updatedData.type == "htmlUpdate") {
      // Update the HTML structure and form values on the client side
      // document.documentElement.innerHTML = updatedData.html;

      if (updatedData.selectValues) {
        const selects = document.querySelectorAll('select')
        for (let i = 0; i < selects.length; i++) {
          selects[i].value = updatedData.selectValues[i] ? updatedData.selectValues[i] : '';
        }
      }

      if (updatedData.textareaValues) {
        const textareas = document.querySelectorAll('textarea');
        for (let i = 0; i < textareas.length; i++) {
          textareas[i].value = updatedData.textareaValues[i] ? updatedData.textareaValues[i] : '';
        }
      }

      if (updatedData.radioValues) {
        const radios = document.querySelectorAll('input[type="radio"]')
        for (let i = 0; i < radios.length; i++) {
          radios[i].checked = updatedData.radioValues[i];
        }
      }

      if (updatedData.checkboxValues) {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxes.length; i++) {
          checkboxes[i].checked = updatedData.checkboxValues[i];
        }
      }

      if (updatedData.pwTextValues) {
        const pwText = document.querySelectorAll('input[type="password"]');
        for (let i = 0; i < pwText.length; i++) {
          pwText[i].value = updatedData.pwTextValues[i] ? updatedData.pwTextValues[i] : '';
        }
      }

      if (updatedData.inputTextValues) {
        const inputText = document.querySelectorAll('input[type="text"]');
        for (let i = 0; i < inputText.length; i++) {
          inputText[i].value = updatedData.inputTextValues[i] ? updatedData.inputTextValues[i] : '';
        }
      }

      //test
      if(document.querySelector('#aka')){
        document.querySelector('#aka').addEventListener('click',function(){
          alert('someone clicked me');
        });
      }
      if(!imgUpdated) {
        let imgData = (updatedData[url.href]) ? updatedData[url.href].canvasImgs : []
        if(!imgData) {
          imgData = []
        }
        console.log(imgData)
        imgUpdating = true
        for(let img of imgData) {
          if(img.type == "mousedown") {
            lastX_whiteboard = data.x
            lastY_whiteboard = data.y
          }
          else if(img.type == "mousemove") {
            ctx_whiteboard.globalCompositeOperation = img.erasing ? 'destination-out' : 'source-over';
            ctx_whiteboard.lineWidth = img.erasing ? 30 : 1; // Set line width based on whether we're erasing or not
            ctx_whiteboard.beginPath()
            ctx_whiteboard.moveTo(lastX_whiteboard, lastY_whiteboard)
            ctx_whiteboard.lineTo(img.x, img.y)
            ctx_whiteboard.stroke()
            lastX_whiteboard = img.x
            lastY_whiteboard = img.y
          }
        }
        if(imgUpdatingBuffer.length > 0) {
          for(let img of imgUpdatingBuffer) {
            if(img.type == "mousedown") {
              lastX_whiteboard = data.x
              lastY_whiteboard = data.y
            }
            else if(img.type == "mousemove") {
              ctx_whiteboard.globalCompositeOperation = img.erasing ? 'destination-out' : 'source-over';
              ctx_whiteboard.lineWidth = img.erasing ? 30 : 1; // Set line width based on whether we're erasing or not
              ctx_whiteboard.beginPath()
              ctx_whiteboard.moveTo(lastX_whiteboard, lastY_whiteboard)
              ctx_whiteboard.lineTo(img.x, img.y)
              ctx_whiteboard.stroke()
              lastX_whiteboard = img.x
              lastY_whiteboard = img.y
            }
          }
        }
        imgUpdating = false
      }
    }
    else if(updatedData.type == "clickUpdate") {
      if(updatedData.url != url.href) {
        return
      }
      const clickElement = document.querySelector('[data-btn="'+updatedData.ele+'"]');

      if(!clickElement.getAttribute('data-btn-clicked')){
        clickElement.click();
      }

      clickElement.removeAttribute('data-btn-clicked');
    }
    else if(updatedData.type == "scrollUpdate") {
      if(updatedData.url != url.href) {
        return
      }
      window.scrollTo(0, updatedData.updatedScrollY);
    }
    else if (updatedData.type === 'mousedown') {
      if(updatedData.url != url.href) {
        return
      }
      ctx_whiteboard.globalCompositeOperation = updatedData.erasing ? 'destination-out' : 'source-over';
      ctx_whiteboard.lineWidth = updatedData.erasing ? 30 : 1; // Set line width based on whether we're erasing or not
      isDrawing_whiteboard = true
      lastX_whiteboard = updatedData.x
      lastY_whiteboard = updatedData.y
    } else if (updatedData.type === 'mousemove' && isDrawing_whiteboard) {
      if(updatedData.url != url.href) {
        return
      }
      ctx_whiteboard.globalCompositeOperation = updatedData.erasing ? 'destination-out' : 'source-over';
      ctx_whiteboard.lineWidth = updatedData.erasing ? 30 : 1; // Set line width based on whether we're erasing or not
      if(imgUpdating) {
        imgUpdatingBuffer.push(updatedData)
      }
      ctx_whiteboard.beginPath()
      ctx_whiteboard.moveTo(lastX_whiteboard, lastY_whiteboard)
      ctx_whiteboard.lineTo(updatedData.x, updatedData.y)
      ctx_whiteboard.stroke()
      lastX_whiteboard = updatedData.x
      lastY_whiteboard = updatedData.y
    } else if (updatedData.type === 'mouseup') {
      if(updatedData.url != url.href) {
        return
      }
      isDrawing_whiteboard = false
    } else if(updatedData.type == "navbarClick") {
      let urlN = updatedData.url
      if(urlN.endsWith("#")) {
        let index = urlN.lastIndexOf("#")
        urlN = urlN.substring(0, index) + urlN.substring(index + 1)
      }
      let originUrl = url.href
      if(originUrl.endsWith("#")) {
        let index = originUrl.lastIndexOf("#")
        originUrl = originUrl.substring(0, index) + originUrl.substring(index + 1)
      }
      if(originUrl == urlN) {
        setTimeout(() => {
          window.location.href = updatedData.redirectUrl
        }, 1000)
      }
      else {
        console.log(originUrl, urlN)
      }
    }
  }
  catch(e) { console.log(e) }
})

// Function to send HTML updates to the server
function sendHtmlUpdate() {
  requestAnimationFrame(() => {
    const textareas = document.querySelectorAll('textarea');
    const selects = document.querySelectorAll('select');
    const radios = document.querySelectorAll('input[type="radio"]');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const pwText = document.querySelectorAll('input[type="password"]');
    const inputText = document.querySelectorAll('input[type="text"]');

    const textareaValues = [];
    const selectValues = [];
    const radioValues = [];
    const checkboxValues = [];
    const inputTextValues = [];
    const pwTextValues = [];

    textareas.forEach((textarea) => {
      textareaValues.push(textarea.value ? textarea.value : '');
    });
    radios.forEach((radio) => {
      radioValues.push(radio.checked);
    });

    checkboxes.forEach((checkbox) => {
      checkboxValues.push(checkbox.checked);
    });

    selects.forEach((select) => {
      selectValues.push(select.value);
    });

    inputText.forEach((input) => {
      inputTextValues.push(input.value ? input.value : '');
    });

    pwText.forEach((input) => {
      pwTextValues.push(input.value ? input.value : '');
    });

    const updatedData = {
      html: document.documentElement.outerHTML,
      textareaValues: textareaValues,
      selectValues: selectValues,
      radioValues: radioValues,
      checkboxValues: checkboxValues,
      inputTextValues: inputTextValues,
      pwTextValues: pwTextValues,
      type: "htmlUpdate"
    };
    // Broadcast the updated HTML and form values to other clients
    if(connected) {
      sendMessage(updatedData);
    }
  });
}

// Function to send scroll position updates to the server
function sendScrollUpdate() {
  const scrollY = window.scrollY;
  if(connected) {
    sendMessage({ type: "scrollUpdate", updatedScrollY: scrollY });
  }
}



function sendButtonClickUpdate(event) {
  const element = event.target.getAttribute('data-btn');
  event.target.setAttribute('data-btn-clicked', 1);

  const updatedData = {
    ele: element,
    type: "clickUpdate"
  };
  if(connected) {
    // Broadcast the updated click counter to other clients
    sendMessage(updatedData);
  }
}

// Create a MutationObserver to track changes in the HTML structure and form values
const observer = new MutationObserver(debounce(sendHtmlUpdate, 10000));
observer.observe(document.documentElement, { childList: true, subtree: true });


// Add event listener to capture scroll events
window.addEventListener('scroll', debounce(sendScrollUpdate, 100));

// Function to send initial scroll position to the server
function sendInitialScrollPosition() {
  const scrollY = window.scrollY;
  if(connected) {
    sendMessage({ type: "scrollUpdate", updatedScrollY: scrollY });
  }
}

function getEnabledModules() {
  return enabledModules
}

function enableWhiteBoard(canvas_whiteboard, ctx_whiteboard_c, drawingElement = null, erasingElement = null, drawingElementEvent = "click", erasingElementEvent = "click") {
  ctx_whiteboard = ctx_whiteboard_c
  isDrawing_whiteboard = false
  isErasing_whiteboard = false
  canvas_whiteboard.addEventListener('mousedown', (e) => {
    isDrawing_whiteboard = true
    sendMessage({ type: 'mousedown', x: e.offsetX, y: e.offsetY, erasing: isErasing_whiteboard, drawing: isDrawing_whiteboard, module: "whiteboard" })
  })

  // Event listener for mouse move
  canvas_whiteboard.addEventListener('mousemove', (e) => {
    sendMessage({ type: 'mousemove', x: e.offsetX, y: e.offsetY, erasing: isErasing_whiteboard, drawing: isDrawing_whiteboard, module: "whiteboard" })
  })

  // Event listener for mouse up
  canvas_whiteboard.addEventListener('mouseup', (e) => {
    isDrawing_whiteboard = false
    sendMessage({ type: "mouseup", x: e.offsetX, y: e.offsetY, erasing: isErasing_whiteboard, module: "whiteboard", drawing: isDrawing_whiteboard })
  })
  if(drawingElement) {
    drawingElement.addEventListener(drawingElementEvent, () => {
      isErasing_whiteboard = false
      isDrawing_whiteboard = true
    })
  }
  if(erasingElement) {
    erasingElement.addEventListener(erasingElementEvent, () => {
      isErasing_whiteboard = true
      isDrawing_whiteboard = false
    })
  }
  enabledModules.whiteboard = true
}

function sendNavbarClickEvent() {
  let navLinks = document.querySelectorAll('a.socket_nav_link')
  for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', function(event) {
      event.preventDefault()
      if (this.hasAttribute('data-url')) {
        sendMessage({ type: "navbarClick", redirectUrl: this.getAttribute('data-url') })
        window.location.href = this.getAttribute('href')
      }
    })
  }
}

// Wait for the page to fully load, then send the initial scroll position
window.addEventListener('DOMContentLoaded', sendInitialScrollPosition);

//setInterval(sendHtmlUpdate, 1000);
sendHtmlUpdate();
sendNavbarClickEvent()
