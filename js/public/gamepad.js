const shortest = (a, b) => a.length > b.length  ? a : b

const PAD_REFRESH_RATE = 50 // ~X Hz
// const PAD_REFRESH_STEP = 255 // [-1,1] mapped to [0,STEP]

let precision = 16
const setPrecision = value => {
    precision = value
}

const gamepads = {}
let currentPad
let lastPad

const padSelector = document.querySelector('#gamepad-selector')
const nullPad = document.createElement('option')
nullPad.innerText = 'None'
nullPad.value = ''

let updateUI = updates => {
    updates.axes.forEach((update) => {
        formatted = `${update.value.toFixed(precision)}`
        currentPad.ui.axes[update.axis].innerText = formatted
    })
    updates.buttons.forEach(update => {
        const formatted = `${update.value.toFixed(precision)}`
        currentPad.ui.buttons[update.button].innerText = formatted
    })
}
const refreshPad = _ => {
    const pads = navigator.getGamepads()

    const updates = {
        axes: pads[currentPad.index].axes
            .reduce((acc, value, i) => value.toFixed(precision)
                !== currentPad.ui.axes[i].innerText
                ? [ ...acc, {axis: i, value} ]
                : acc, []),
        buttons: pads[currentPad.index].buttons
            .reduce((acc, {value}, i) => value.toFixed(precision)
                !== currentPad.ui.buttons[i].innerText
                ? [ ...acc, {button: i, value} ]
                : acc, [])
    }
    if (updates.axes.length || updates.buttons.length) {
        const buttonUpdates = updates.buttons.reduce((acc, update) => {
            const binding = bindings.buttons[update.button]
            return binding && binding.action
                ? [...acc, {
                    action: binding.action,
                    value: !binding.invert ? update.value : -update.value
                }] : acc
        }, [])
        const axisUpdates = updates.axes.reduce((acc, update) => {
            const binding = bindings.axes[update.axis]
            return binding && binding.action
                ? [...acc, {
                    action: binding.action,
                    value: !binding.invert ? update.value : -update.value
                }] : acc
        }, [])
        const payload = [ ...axisUpdates, ...buttonUpdates ]
        payload.length && socket.emit('padUpdates', payload)
        updateUI(updates)
    }
}

const initPad = gamepad => {
    const axes = document.querySelector('#pad-analogs')
    const buttons = document.querySelector('#pad-buttons')

    const mapInputs = (inputs, type) => inputs.map((_, idx) => {
        const data = document.createElement('span')
        data.id = `${type}-${idx}`
        data.className = `${type}-data`
        const index = document.createElement('span')
        index.className = 'width-xxs'
        index.innerText = `${idx}:`
        const row = document.createElement('div')
        row.className = 'row'
        row.appendChild(index)
        row.appendChild(data)
        return data
    })
    gamepad.ui.axes = mapInputs(gamepad.axes, 'axis')
    axes.replaceChildren(...gamepad.ui.axes.map(e => e.parentElement))

    gamepad.ui.buttons = mapInputs(gamepad.buttons, 'button')
    buttons.replaceChildren(...gamepad.ui.buttons.map(e => e.parentElement))

    gamepad.refreshInterval = setInterval(refreshPad, 1000/PAD_REFRESH_RATE)
}
const clearPad = pad => {
    clearInterval(pad.refreshInterval)
    pad.ui.axes.forEach(elem => elem.remove())
    pad.ui.buttons.forEach(elem => elem.remove())
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
    const gamepad = event.gamepad
    console.log(gamepad)

    if (connecting) {
        gamepads[gamepad.index] = gamepad;
        const option = document.createElement('option')
        option.value = gamepad.index
        option.innerText = `${gamepad.index}: ${getPadName(gamepad)}`
        gamepads[gamepad.index].ui = { padOption: option }
        lastPad && !currentPad
            && gamepad.id === lastPad.id && gamepad.index === lastPad.index
            && selectPad(gamepad.index)
    } else {
        gamepads[gamepad.index].ui.padOption.remove()
        if (gamepad.index === currentPad.index) {
            // Current pad just disconnected
            clearInterval(currentPad.refreshInterval)
            padSelector.value = ''
            alert('Current pad disconnected !')
            lastPad = currentPad
            currentPad = null
        }
        delete gamepads[gamepad.index]
    }
    // padOptions = Object.keys(gamepads).map(k => gamepads[k].ui.padOption)
    padOptions = Object.values(gamepads).map(({ ui }) => ui.padOption)
    padSelector.replaceChildren(nullPad, ...padOptions)
    if (currentPad)
        padSelector.value = currentPad.index
    else
        padSelector.value = ''
}

window.addEventListener("gamepadconnected", e => {
    updatePads(e, true)
}, false);
window.addEventListener("gamepaddisconnected", e => {
    updatePads(e, false)
}, false)
