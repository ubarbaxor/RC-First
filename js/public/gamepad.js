const PAD_REFRESH_RATE = 100 // ~100Hz

const gamepads = {};
let currentPad

const padSelector = document.querySelector('#gamepad-selector')
const nullOption = document.createElement('option')
nullOption.innerText = 'None'

const refreshPad = _ => {
    // TODO
}

const getPadName = pad => `${pad.id
    .replace(/\([^)]*\)/, "")
    .replace(/\s+/, ' ').trim()
}`

const selectPad = padIndex => {
    clearInterval(currentPad.refreshInterval)
    currentPad = gamepads[padIndex]
    console.log(`Select pad ${currentPad && currentPad.index}`)

    const payload = currentPad
        ? {
            id: currentPad.id,
            idx: currentPad.index,
            name: getPadName(currentPad),
        } : currentPad // undefined, send None
    socket.emit('selectedPad', payload)

    currentPad.refreshInterval = setInterval(refreshPad, 1000/PAD_REFRESH_RATE)
}

const updatePads = (event, connecting) => {
    var gamepad = event.gamepad
    console.log(gamepad)

    if (connecting) {
        gamepads[gamepad.index] = gamepad;
        const padOption = document.createElement('option')
        padOption.value = gamepad.index
        padOption.innerText = `${gamepad.index}: ${getPadName(gamepad)}`
        gamepads[gamepad.index].HTMLElement = padOption
    } else {
        gamepads[gamepad.index].HTMLElement.remove()
        if (gamepad.index === currentPad.index) {
            // Current pad just disconnected
            clearInterval(currentPad.refreshInterval)
            alert('Warning ! Current pad disconnected.')
        }
        delete gamepads[gamepad.index]
    }
    padOptions = Object.keys(gamepads).map(k => gamepads[k].HTMLElement)
    padSelector.replaceChildren(nullOption, ...padOptions)
    padSelector.value = currentPad && currentPad.index
}

window.addEventListener("gamepadconnected", e => {
    updatePads(e, true)
}, false);
window.addEventListener("gamepaddisconnected", e => {
    updatePads(e, false)
}, false)
