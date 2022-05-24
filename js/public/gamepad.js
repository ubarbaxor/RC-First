const shortest = (a, b) => a.length > b.length  ? a : b

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
        axes: pads[currentPad.index].axes.reduce((acc, value, i) => [
                ...acc,
                value.toFixed(precision) !== currentPad.ui.axes[i].innerText
                    && {axis: i, value}
            ], []).filter(x => x),
        buttons: pads[currentPad.index].buttons.reduce((acc, {value}, i) => [
                ...acc,
                value.toFixed(precision) !== currentPad.ui.buttons[i].innerText
                    && {button: i, value}
            ], []).filter(x => x)
    }
    if (updates.axes.length || updates.buttons.length) {
        updates.axes.forEach(xu => {
            if (bindings.axes[xu.axis]) {
                console.log(xu)
                const x = bindings.axes[xu.axis]
                console.log(x)
                console.log('>', x.action, xu.value) }
        })
        updates.buttons.forEach(bu => {
            if (bindings.buttons[bu.button]) {
                const b = bindings.buttons[bu.button]
                console.log('>', b.action, bu.value) }
        })
        updateUI(updates)
    }
}

const initPad = gamepad => {
    const axes = document.querySelector('#pad-analogs')
    const buttons = document.querySelector('#pad-buttons')

    gamepad.ui.axes = gamepad.axes.map((_, idx) => {
        const elem = document.createElement('span')
        elem.id = `axis-${idx}`
        elem.className = 'axis-data'
        const parent = document.createElement('div')
        parent.className = 'row'
        parent.innerHTML = `${idx}: `
        parent.appendChild(elem)
        return elem
    })
    axes.replaceChildren(...gamepad.ui.axes.map(e => e.parentElement))

    gamepad.ui.buttons = gamepad.buttons.map((button, idx) => {
        const elem = document.createElement('span')
        elem.id = `button-${idx}`
        elem.className = 'button-data'
        const parent = document.createElement('div')
        parent.className = 'row'
        parent.innerText = `${idx}: `
        parent.appendChild(elem)
        return elem
    })
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
