'use strict'
const bindings = {
    axes: {},
    buttons: {}
}
const setBinding = (e, values = undefined) => {
    let binding = e ? e.target.closest('div.binding') : addBinding(values)
    console.log(binding)
    if (!binding) {
        return
    }
    // A bit of validation
    // const labelText = binding.labels[0].innerText
    // if (labelText === 'Index' && e.target.value < 0)
    //     e.target.value = ''
    const getVal = valName => binding?.querySelector(`[name=${valName}]`)?.value
    const type = getVal('inputType')
    const idx = getVal('inputId')
    if (!type || !idx) {
        return
    }
    // Input already bound
    if (bindings[type][idx]) {
        // Different binding id
        if (binding.id !== `bind-${type}-${idx}`) {
            if (confirm(`Override ${type} ${idx} ?`)) {
                document.getElementById(`bind-${type}-${idx}`)?.remove()
                delete bindings[type][idx]
            } else {
                // Fired from event
                if (e) {
                    e.target.value = ''
                }
                // User canceled from restore
                else {
                    binding.remove()
                }
                return
            }
        }
    }
    if (binding.id && binding.id !== `bind-${type}-${idx}`) {
        const oldId = binding.id.split('-')
        delete bindings[oldId[1]][oldId[2]]
    }
    binding.id = `bind-${type}-${idx}`
    bindings[type][idx] = {
        name: getVal('name'),
        invert: getVal('invert') === 'true',
        action: getVal('action')
    }
}
const addBinding = values => {
    const labelInput = ({ label, elem, onChange, onInput, ...props }) => {
        const el = document.createElement('label')
        if (label) el.innerText = label
        const c = document.createElement(elem)
        Object.keys(props).forEach(k => (c[k] = props[k]))
        if (onChange)
            c.addEventListener('change', e => {
                onChange(e)
            })
        if (onInput)
            c.addEventListener('input', e => {
                onInput(e)
            })
        if (!label) {
            el.remove()
            return c
        }
        el.appendChild(c)
        return el
    }
    // Basically a form but hush
    const binding = document.createElement('div')
    binding.className = 'binding row'
    // Select for input type
    const bindingType = labelInput({
        label: 'Type',
        name: 'inputType',
        elem: 'select',
        onChange: setBinding
    })
    binding.appendChild(bindingType)
    // Option: axis
    const optionAnalog = labelInput({
        elem: 'option',
        value: 'axes',
        innerText: 'Axis'
    })
    bindingType?.firstElementChild?.appendChild(optionAnalog)
    // Option: button
    const optionButton = labelInput({
        elem: 'option',
        value: 'buttons',
        innerText: 'Button'
    })
    bindingType?.firstElementChild?.appendChild(optionButton)
    // Button/Axis number
    const bindingId = labelInput({
        label: 'Index',
        name: 'inputId',
        elem: 'input',
        type: 'number',
        className: 'width-xs',
        onChange: setBinding
    })
    binding.appendChild(bindingId)
    // Bind name
    const bindingName = labelInput({
        label: 'Name',
        name: 'name',
        elem: 'input',
        type: 'text',
        className: 'width-xs',
        onInput: setBinding
    })
    binding.appendChild(bindingName)
    // Invert ?
    const bindingInvert = labelInput({
        label: 'Invert',
        name: 'invert',
        elem: 'input',
        type: 'checkbox',
        className: 'width-xs',
        onChange: e => {
            e.target.value = e.target.checked ? 'true' : 'false'
            setBinding(e)
        }
    })
    binding.appendChild(bindingInvert)
    // Bind RC code
    const bindingRC = labelInput({
        label: 'Action',
        name: 'action',
        elem: 'input',
        type: 'text',
        maxLength: 8,
        className: 'width-s',
        onInput: setBinding
    })
    binding.appendChild(bindingRC)
    document.querySelector('#bindings-list')?.prepend(binding)
    if (values) {
        Object.keys(values).forEach(k => {
            const bindingInput = binding.querySelector(`[name="${k}"]`)
            if (bindingInput) {
                bindingInput.value = values[k]
                if (values[k] === true && bindingInput.type === 'checkbox') {
                    bindingInput.checked = true
                }
            }
        })
        return binding
    }
}
const loadBindings = _ => {
    if (localStorage.bindings) {
        const inputs = JSON.parse(localStorage.bindings)
        if (!inputs) {
            console.warn('No bindings in local storage')
            return
        }
        for (const inputType of ['axes', 'buttons']) {
            Object.keys(inputs[inputType]).forEach(inputId => {
                setBinding(null, {
                    ...inputs[inputType][inputId],
                    inputType,
                    inputId
                })
            })
        }
    }
}
const persistBindings = _ => {
    window.localStorage.bindings = JSON.stringify(bindings)
}
const clearBindings = _ => {
    bindings.axes = {}
    bindings.buttons = {}
    document.querySelectorAll('.binding').forEach(el => {
        el.remove()
    })
}
