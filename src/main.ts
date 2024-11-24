import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { Input } from '@julusian/midi'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	public midi_input: Input = new Input() // Set up a new Midi input.

	constructor(internal: unknown) {
		super(internal)
	}

	public config: ModuleConfig = {
		virtual_midi_port_name: '',
		midi_port_dropdown: 'virtual',
		companion_host: '127.0.0.1',
		companion_port: 8000,
		page_offset: 0,
	}

	async init(config: ModuleConfig): Promise<void> {
		this.log('debug', 'Module instance initialising')
		this.updateStatus(InstanceStatus.Connecting)
		await this.configUpdated(config)
		this.log('debug', 'Module instance initialised')
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.midi_input.destroy()
		this.log('debug', 'Module instance destroyed')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.log('debug', 'config updating')
		this.config = config

		// Close midi port (if open) and recreate
		if (this.midi_input.isPortOpen()) {
			this.log('debug', 'Closing Midi port')
			this.midi_input.closePort()
			this.midi_input.destroy()
			this.midi_input = new Input()
		}

		// Get MIDI port configs and open port
		const virtual_midi_port_name: string = this.config.virtual_midi_port_name
		const midi_port_name: string = this.config.midi_port_dropdown
		// Connect to configured MIDI (virtual) port.
		try {
			if (midi_port_name == 'virtual') {
				this.log('debug', 'Connecting virtual_midi_port_name: ' + virtual_midi_port_name)
				this.midi_input.openVirtualPort(virtual_midi_port_name)
			} else {
				this.log('debug', 'Connecting midi_port_name: ' + midi_port_name)
				this.midi_input.openPortByName(midi_port_name)
			}
		} catch (error) {
			let message = 'Unknown Error'
			if (error instanceof Error) message = error.message
			this.log('debug', 'Error connecting midi port: ' + message)
		}

		// Configure a callback for MIDI input messages
		this.log('debug', 'Adding event listener')
		this.midi_input.removeAllListeners()
		this.midi_input.on('message', async (deltaTime, message) => {
			const midiMessageIsNoteon: boolean = (message[0] & 0x90) == 0x90
			const midiMessageChannel: number = message[0] & 0x0f
			const midiMessageNote: number = message[1]
			const midiMessageVelocity: number = message[2]
			this.log(
				'debug',
				`MIDI Message: Midi Channel: ${midiMessageChannel}, Is Note On?: ${midiMessageIsNoteon}, Note: ${midiMessageNote}, Velocity: ${midiMessageVelocity}, Delta Time: ${deltaTime}`,
			)

			if (midiMessageIsNoteon) {
				// api/location/<page>/<row>/<column>/press
				// page = channel
				// row = note
				// column = velocity
				const buttonPressURL = `http://${this.config.companion_host}:${this.config.companion_port}/api/location/${midiMessageChannel + 1 + this.config.page_offset}/${midiMessageNote}/${midiMessageVelocity}/press`
				this.log('debug', 'Sending button press HTTP request to: ' + buttonPressURL)

				fetch(buttonPressURL, {
					signal: AbortSignal.timeout(2000),
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
				})
				.then((response) => {
					this.log('debug', 'Button press response: ' + response.status + ': ' + response.statusText)
				})
				.catch((error) => {
					this.log('debug', 'Error fetching ' + buttonPressURL + '. ' + error)
				})
			}
		})

		this.updateStatus(InstanceStatus.Ok)
		this.log('debug', 'config updated')
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields(this.midi_input)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
