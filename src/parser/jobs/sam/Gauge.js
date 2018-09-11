import React, {Fragment} from 'react'
//import {Icon, Message} from 'semantic-ui-react'

import {ActionLink} from 'components/ui/DbLink'
import ACTIONS from 'data/ACTIONS'
//import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
import {Suggestion, SEVERITY} from 'parser/core/modules/Suggestions'

//future-proofing for more kenki actions

const MAX_KENKI = 100

const KENKI_BUILDERS = {

	//single target
	[ACTIONS.GEKKO.id]: 10,
	[ACTIONS.KASHA.id]: 10,
	[ACTIONS.YUKIKAZE.id]: 10,
	[ACTIONS.HAKAZE.id]: 5,
	[ACTIONS.JINPU.id]: 5,
	[ACTIONS.SHIFU.id]: 5,
	//aoe
	[ACTIONS.MANGETSU.id]: 10,
	[ACTIONS.OKA.id]: 10,
	[ACTIONS.FUGA.id]: 5,
	//ranged
	[ACTIONS.ENPI.id]: 10,
}

const KENKI_SPENDERS = {
	[ACTIONS.HISSATSU_GYOTEN.id]: 10,
	[ACTIONS.HISSATSU_YATEN.id]: 10,
	[ACTIONS.HISSATSU_SEIGAN.id]: 15,
	[ACTIONS.HISSATSU_KAITEN.id]: 20,
	[ACTIONS.HISSATSU_SHINTEN.id]: 25,
	[ACTIONS.HISSATSU_KYUTEN.id]: 25,
	[ACTIONS.HISSATSU_GUREN.id]: 50,
}

// sen stuff

// 1 sen value for each finisher. using finisher with sen you already have is bad.
const MAX_GEKKO_SEN = 1
const MAX_KASHA_SEN = 1
const MAX_YUKIKAZE_SEN = 1

export default class Gauge extends Module {
	static handle = 'gauge'
	static dependencies = [
		'gcd',
		'combatants',
		'cooldowns',
		'suggestions',
	]

	//kenki
	_kenki = 0
	_wastedKenki = 0

	//meditate
	_Meditate = []

	//sen
	_gekkosen = 0
	_kashasen = 0
	_yukikazesen = 0

	_wastedsen = 0

	constructor(...args) {
		super(...args)
		this.addHook('cast', {by: 'player'}, this._onCast)
		this.addHook('death', {to: 'player'}, this._onDeath)
		this.addHook('removebuff', {
			by: 'player',
			abilityId: STATUSES.MEDITATE.id,
		}, this._onRemoveMeditate)
		this.addHook('complete', this._onComplete)
	}
	//check for kenki value changes, then sen changes
	_onCast(event) {
		const abilityId = event.ability.guid
		if (KENKI_BUILDERS[abilityId]) {
			this._addKenki(abilityId)
		}
		if (KENKI_SPENDERS[abilityId]) {
			this._kenki -= KENKI_SPENDERS[abilityId]
		}
		if (abilityId === ACTIONS.HAGAKURE.id) {
			this._Sen2Kenki()
		}
		if (abilityId ===ACTIONS.HIGANBANA.id || abilityId === ACTIONS.TENKA_GOKEN.id || abilityId === ACTIONS.MIDARE_SETSUGEKKA.id) {
			this._removeSen()
		}
		if (abilityId === ACTIONS.GEKKO.id || abilityId === ACTIONS.MANGETSU.id) {
			this._addGekkoSen()
		}
		if (abilityId === ACTIONS.KASHA.id || abilityId === ACTIONS.OKA.id) {
			this._addKashaSen()
		}
		if (abilityId === ACTIONS.YUKIKAZE.id) {
			this._addYukikazeSen()
		}
		if (abilityId === ACTIONS.MEDITATE.id) {
			const startMeditate = this.Meditate[0].timestamp
		}
	}

	_onRemoveMediate() {
		const endMeditate = this.Meditate[1].timestamp
		this._MeditateKenki
	}

	//kenki quick maths

	_addKenki(abilityId) {
		this._kenki += KENKI_BUILDERS[abilityId]
		if (this._kenki > MAX_KENKI) {
			const waste = this._kenki - MAX_KENKI
			this._wastedKenki += waste
			this._kenki = MAX_KENKI
			return waste
		}
		return 0
	}

	_Sen2Kenki() {
		this._kenki += ((this._gekkosen + this._kashasen + this._yukikazesen) * 20)
		if (this.kenki > MAX_KENKI) {
			const waste = this._kenki - MAX_KENKI
			this._wastedKenki += waste
			this._kenki = MAX_KENKI
			return waste
		}

		this._removeSen()

		return 0
	}

	_MeditateKenki() {

		const MeditateChannel = endMeditate - startMeditate

		const MKG = ((MeditateChannel / 100) % 3) * 10

		this.kenki += MKG
		if (this.kenki > MAX_KENKI) {
			const waste = this._kenki - MAX_KENKI
			this._wastedKenki += waste
			this._kenki = MAX_KENKI
			return waste
		}

		this._removeSen()

		return 0

	}

	//sen calcs

	_addGekkoSen() {
		this._gekkosen += 1
		if (this._gekkosen > MAX_GEKKO_SEN) {
			const waste = this._gekkosen - MAX_GEKKO_SEN
			this._wastedsen += waste
			return waste
		}
		return 0
	}

	_addKashaSen() {
		this._kashasen += 1
		if (this._kashasen > MAX_KASHA_SEN) {
			const waste = this._kashasen - MAX_KASHA_SEN
			this._wastedsen += waste
			return waste
		}
		return 0
	}

	_addYukikazeSen()  {
		this._yukikazesen += 1
		if (this._yukikazesen > MAX_YUKIKAZE_SEN) {
			const waste = this._yukikazesen - MAX_YUKIKAZE_SEN
			this._wastedsen += waste
			return waste
		}
		return 0
	}

	_removeSen() {
		this._gekkosen = 0
		this._kashasen = 0
		this._yukikazesen = 0

		return 0
	}

	_onDeath() {
		// Death just flat out resets everything. Stop dying.
		this._wastedKenki += this._kenki
		this._kenki = 0

		this._wastedsen += (this._gekkosen + this._kashasen + this._yukikzaesen)
		this._gekkosen = this._kashasen = this._yukikazesen = 0
	}

	_onComplete() {
		//kenki suggestions
		if (this._wastedKenki >= 20) {
			this.suggestions.add(new Suggestion({
				icon: ACTIONS.HAKAZE.icon,
				content: <Fragment>
					You used kenki builders in a way that overcapped you.
				</Fragment>,
				severity: this._wastedKenki === 20? SEVERITY.MINOR : this._wastedKenki >= 50? SEVERITY.MEDIUM : SEVERITY.MAJOR,
				why: <Fragment>
					You wasted {this._wastedKenki} kenki by using abilities that sent you over the cap.
				</Fragment>,
			}))
		}

		//sen suggestions
		if (this._wastedsen >= 1) {
			this.suggestions.add(new Suggestion({
				icon: ACTIONS.MEIKYO_SHISUI.icon,
				content: <Fragment>
					You used <ActionLink {...ACTIONS.GEKKO}/>, <ActionLink {...ACTIONS.KASHA}/>, <ActionLink {...ACTIONS.YUKIKAZE}/>, at a time when you already had that sen, thus wasting a combo because it did not give you sen.
				</Fragment>,
				severity: this._wastedsen === 1? SEVERITY.MINOR : this._wastedsen >= 3? SEVERITY.MEDIUM : SEVERITY.MAJOR,
				why: <Fragment>
					You lost {this._wastedsen} sen by using finishing combos that gave you sen you already had.
				</Fragment>,
			}))
		}
	}
}
