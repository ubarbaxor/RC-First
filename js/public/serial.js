let serialPorts = {}

const portSelector = document.getElementById('serial-selector')

const nullPort = document.createElement('option')
nullPort.innerText = 'None'
nullPort.value = ''

socket.on('serialPorts', ports => {
    const selectedPort = portSelector.value

    serialPorts = ports.reduce((acc, {path, friendlyName, ...attr}, i) => ({
        ...acc,
        [path]: { index: i, friendlyName, ...attr }
    }), {})

    portOptions = ports.map(p => {
        const e = document.createElement('option')
        e.innerText = p.friendlyName
        e.value = p.path
        return e
    })
    portSelector.replaceChildren(nullPort, ...portOptions)
    if (selectedPort in serialPorts) {
        portSelector.value = selectedPort
        selectPort(selectedPort)
    }
})
socket.on('portSelected', port => console.log(`Selected port ${port}`))
socket.on('portResumed', port => console.log(`Resumed port ${port}`))

const queryPorts = _ => {
    socket.emit('listPorts')
}

const selectPort = port => {
    socket.emit('selectPort', port)
}
