import { Regex, type SomeCompanionConfigField, CompanionInputFieldDropdown } from '@companion-module/base'
import os from 'os'
import { Input } from '@julusian/midi'

export interface ModuleConfig {
	companion_host: string
	companion_port: number
	virtual_midi_port_name: string
	midi_port_dropdown: string
	page_offset: number
}

export function GetConfigFields(midi_input: Input): SomeCompanionConfigField[] {
	const platform: string = os.platform()
	const virtualSupported: boolean = platform == 'darwin' || platform == 'linux'

	const port_count = midi_input.getPortCount()
	const midi_port_dropdown: CompanionInputFieldDropdown = {
		type: 'dropdown',
		id: 'midi_port_dropdown',
		tooltip:
			'The MIDI port that this module will listen to and push Companion buttons when a MIDI Note-On msg is recieved. Channel/Note/Intensity => page/row/column)',
		label: 'Midi Port Name',
		choices: [],
		default: '',
	}
	for (let portIndex = 0; portIndex < port_count; portIndex++) {
		const port_name = midi_input.getPortName(portIndex)
		midi_port_dropdown.choices.push({ id: port_name, label: port_name })
	}
	if (virtualSupported) {
		midi_port_dropdown.choices.push({ id: 'virtual', label: 'Custom Virtual Port' })
		midi_port_dropdown.default = 'virtual'
	} else {
		midi_port_dropdown.default = midi_input.getPortName(0)
	}

	return [
		{
			type: 'textinput',
			id: 'companion_host',
			label: 'Companion IP',
			width: 8,
			regex: Regex.IP,
			default: '127.0.0.1',
		},
		{
			type: 'number',
			id: 'companion_port',
			label: 'Companion Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8000,
		},
		midi_port_dropdown as SomeCompanionConfigField,
		{
			type: 'textinput',
			id: 'virtual_midi_port_name',
			label: 'Virtual Midi Port Name',
			width: 4,
			isVisible: (options) => options.midi_port_dropdown == 'virtual',
			default: 'CompanionMIDIButtonPresser',
		},
		{
			type: 'number',
			id: 'page_offset',
			label: 'Page offset',
			width: 8,
			min: 0,
			max: 500,
			default: 0,
		},
	]
}
