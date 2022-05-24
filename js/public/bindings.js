const bindings = {
    axes: {},
    buttons: {}
}
const setBinding = e => {
    let binding = e.target.closest('div.bindingControl')
    const getVal = valName => binding.querySelector(`[name=${valName}]`).value

    const type = getVal('input-type')
    const idx = getVal('input-id')

    if (!type || !idx) { return }

    if (bindings[type] && bindings[type][idx]) {
        if (binding.id !== `bind-${type}-${idx}`) {
            if (confirm(`Override ${type} ${idx} ?`))
                document.getElementById(`bind-${type}-${idx}`).remove()
            else
                return
        }
    }
    binding.id = `bind-${type}-${idx}`

    bindings[type] = {
        ...bindings[type],
        [idx]: {
            name: getVal('name'),
            invert: getVal('invert'),
            action: getVal('action'),
        }
    }
}

const addBinding = _ => {
    const labelInput = ({ label, elem, onChange, onInput, ...props }) => {
        const e = document.createElement('label')
        e.innerText = label
        const c = document.createElement(elem)
        Object.keys(props).forEach(k => c[k] = props[k])
        if (onChange)
            c.addEventListener('change', onChange)
        if (onInput)
            c.addEventListener('input', onInput)

        if (!label) {
            e.remove()
            return c
        }
        e.appendChild(c)
        return e
    }
    // Basically a form but hush
    const bindingControl = document.createElement('div')
    bindingControl.className = "bindingControl row"
    // Select for input type
    const bindingType = labelInput({ label: "Type:", name: 'input-type', elem: 'select', onChange: setBinding })
    bindingControl.appendChild(bindingType)
    // Option: axis
    const optionAnalog = labelInput({ elem: 'option', value: 'axes', innerText: "Axis" })
    bindingType.firstElementChild.appendChild(optionAnalog)
    // Option: button
    const optionButton = labelInput({ elem: 'option', value: 'buttons', innerText: "Button" })
    bindingType.firstElementChild.appendChild(optionButton)
    // Button/Axis number
    const bindingId = labelInput({ label: 'Index', name: 'input-id', elem: 'input', type: 'number', className: 'width-s', onChange: setBinding })
    bindingControl.appendChild(bindingId)
    // Bind name
    const bindingName = labelInput({ label: 'Name', name: 'name', elem: 'input', type: 'text', className: 'width-s', onInput: setBinding })
    bindingControl.appendChild(bindingName)
    // Invert ?
    const bindingInvert = labelInput({ label: 'Invert', name: 'invert', elem: 'input', type: 'checkbox', onChange: setBinding })
    bindingControl.appendChild(bindingInvert)
    // Bind RC code
    bindingRC = labelInput({ label: 'Action', name: 'action', elem: 'input', type: 'text', className: 'width-m', onInput: setBinding })
    bindingControl.appendChild(bindingRC)

    document.querySelector('#bindings-list').prepend(bindingControl)
}
