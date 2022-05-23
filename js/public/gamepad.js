const PAD_REFRESH_RATE = 100 // ~X Hz
// const PAD_REFRESH_STEP = 255 // [-1,1] mapped to [0,STEP]

let precision = 16
const setPrecision = value => {
    precision = value
}

const gamepads = {}
let currentPad

const padSelector = document.querySelector('#gamepad-selector')
const nullOption = document.createElement('option')
nullOption.innerText = 'None'

let updateUI = pad => {
    currentPad.ui.axes.forEach((axis, idx) => {
        formatted = `${idx}: ${pad.axes[idx].toFixed(precision)}`
        if (formatted !== axis.innerText)
            axis.innerText = formatted
    })
    currentPad.ui.keys.forEach((key, idx) => {
        const button = pad.buttons[idx]
        const value = button.value ? `${button.value.toFixed(precision)}`
            : button.pressed ? `P`
            : button.touched ? `T`
            : `O`
        const formatted = `${idx}: ${value}`

        if (formatted !== key.innerText)
            key.innerText = formatted
    })
}
const refreshPad = _ => {
    const pads = navigator.getGamepads()

    updateUI(pads[currentPad.index])
}

const initPad = gamepad => {
    const analogs = document.querySelector('#pad-analogs')
    const presses = document.querySelector('#pad-buttons')

    gamepad.ui.axes = gamepad.axes.map((_, idx) => {
        const elem = document.createElement('div')
        elem.id = `axis-${idx}`
        return elem
    })
    analogs.replaceChildren(...gamepad.ui.axes)

    gamepad.ui.keys = gamepad.buttons.map((button, idx) => {
        const elem = document.createElement('div')
        elem.id = `button-${idx}`
        button.HTMLElement = elem
        return elem
    })
    presses.replaceChildren(...gamepad.ui.keys)

    gamepad.refreshInterval = setInterval(refreshPad, 1000/PAD_REFRESH_RATE)
}
const clearPad = pad => {
    clearInterval(pad.refreshInterval)
    pad.ui.axes.forEach(elem => elem.remove())
    pad.ui.keys.forEach(elem => elem.remove())
}

const getPadName = pad => `${pad.id
    .replace(/\([^)]*\)/, "")
    .replace(/\s+/, ' ').trim()
}`

const selectPad = padIndex => {
    currentPad
        ? clearPad(currentPad)
        : document.querySelector('#padUI').style.display = 'flex'
    currentPad = gamepads[padIndex]
    console.log(`Select pad ${currentPad && currentPad.index}`)

    const payload = currentPad
        ? {
            id: currentPad.id,
            idx: currentPad.index,
            name: getPadName(currentPad),
        } : currentPad // undefined, send None
    socket.emit('selectedPad', payload)

    currentPad
        ? initPad(currentPad)
        : document.querySelector('#padUI').style.display = 'none'
}

const updatePads = (event, connecting) => {
    var gamepad = event.gamepad
    console.log(gamepad)

    if (connecting) {
        gamepads[gamepad.index] = gamepad;
        const padOption = document.createElement('option')
        padOption.value = gamepad.index
        padOption.innerText = `${gamepad.index}: ${getPadName(gamepad)}`
        gamepads[gamepad.index].ui = {
            selectOption: padOption
        }
    } else {
        gamepads[gamepad.index].ui.padOption.remove()
        if (gamepad.index === currentPad.index) {
            // Current pad just disconnected
            clearInterval(currentPad.refreshInterval)
            alert('Warning ! Current pad disconnected.')
        }
        delete gamepads[gamepad.index]
    }
    padOptions = Object.keys(gamepads).map(k => gamepads[k].ui.selectOption)
    padSelector.replaceChildren(nullOption, ...padOptions)
    padSelector.value = currentPad && currentPad.index
}

window.addEventListener("gamepadconnected", e => {
    updatePads(e, true)
}, false);
window.addEventListener("gamepaddisconnected", e => {
    updatePads(e, false)
}, false)
