var gamepads = {};

const padSelector = document.querySelector('#gamepad-selector')
const nullOption = document.createElement('option')
let selectedPad = ''

const selectPad = _ => {
    selectedPad = padSelector.value
    console.log(gamepads[selectedPad]
        ? gamepads[selectedPad].id
        : 'No pad selected')
}

const updatePads = (event, connecting) => {
    const currentPad = padSelector.value && gamepads[padSelector.value]
    var gamepad = event.gamepad
    console.log(gamepad)

    if (connecting) {
        gamepads[gamepad.index] = gamepad;
        const padOption = document.createElement('option')
        padOption.value = gamepad.index
        padOption.innerText = gamepad.id
        gamepads[gamepad.index].HTMLElement = padOption
    } else {
        delete gamepads[gamepad.index];
        document.querySelector(`#pad-option-${gamepad.index}`).remove()
    }
    padOptions = Object.keys(gamepads).map(k => gamepads[k].HTMLElement)
    padSelector.replaceChildren(nullOption, ...padOptions)
    padSelector.value = gamepads[currentPad.index]
        ? currentPad.index
        : ''
}

window.addEventListener("gamepadconnected", e => {
    updatePads(e, true)
}, false);
window.addEventListener("gamepaddisconnected", e => {
    updatePads(e, false)
}, false)
