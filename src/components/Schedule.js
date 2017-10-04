import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Nav, NavItem, Well, Panel, Table } from 'react-bootstrap';
import { Button } from 'react-bootstrap';
import { updateZone, updateVacationSchedule } from '../actions/AppActions';
import { LocaleProvider, TimePicker, DatePicker } from 'antd';
import locales from 'antd/lib/locale-provider/en_US';
import moment from 'moment';

// import moment from 'moment';

// import LoadingIndicator from './LoadingIndicator';
import UnderDevelopmentBanner from './UnderDevelopmentBanner';
import {
  getZonesForCurrentSystem,
  getSchedulesForCurrentSystem,
	getMomentsForCurrentSchedules,
	getVacationsForCurrentSystem,
} from '../util/deviceShadowUtil';
import { DAY_NAMES } from '../constants/ScheduleConstants';

import 'antd/dist/antd.css';  // or 'antd/dist/antd.less'
import './Panel.css';
import './Table.css';
import './Schedule.css';

const { RangePicker } = DatePicker;
moment.locale('en');

class Schedule extends Component {
	state = {
		activeKey: '1',
  }

	handleSelect = (eventKey) => {
		this.setState({ activeKey: eventKey });
	}

	// given a start or end time and an array of zones and/or days, update the hardware
	onArrayTimeChange = (moments, occOrUnocc, dayChoices, zoneChoices, timeMoment, timeString) => {
		zoneChoices.forEach( (zone) => {
			dayChoices.forEach( (day) => {
				this.onIndividualTimeChange(moments, occOrUnocc, day, zone, timeMoment, timeString);
			} )
		} )
	}

	// given a start or end time, a zone, and a day, update the hardware
	onIndividualTimeChange = (moments, occOrUnocc, dayChoice, zoneChoice, timeMoment, timeString) => {
		if (this.validateTime(moments, occOrUnocc, dayChoice, zoneChoice, timeMoment)) {
			const [hourMinute, amOrPmStr] = timeMoment.format('h:mm A').toString().split(" ");
			const [hour, minute] = hourMinute.split(":");
			const amOrPm = (amOrPmStr === 'PM' ? 1 : 0);
			this.props.onZoneUpdate(hour, `${DAY_NAMES[dayChoice]}${occOrUnocc}Hour`, zoneChoice);
			this.props.onZoneUpdate(minute, `${DAY_NAMES[dayChoice]}${occOrUnocc}Minute`, zoneChoice);
			this.props.onZoneUpdate(amOrPm, `${DAY_NAMES[dayChoice]}${occOrUnocc}AmPm`, zoneChoice);
		}
	}

	validateTime = (moments, occOrUnocc, dayChoice, zoneChoice, newTimeMoment) => {
		// if setting occupied time, must be earlier than unocc
		if (occOrUnocc === 'Occupied') {
			// careful of edge case where unoccupied doesn't exist?
			return newTimeMoment.isBefore(moments[zoneChoice][dayChoice].endMoment)
		} else {
			// if setting unocc time, must be later than occ
			return newTimeMoment.isAfter(moments[zoneChoice][dayChoice].startMoment)
		}
	}
	// given an array of zones and an array of days, if they all have the same moment, return it; otherwise, return
	// an empty object
	allEqual = (moments, startOrEndMoment, zoneArray, dayArray) => {

		const firstMoment = moments[zoneArray[0]][dayArray[0]][startOrEndMoment];

		const allEq = zoneArray.map( (zone) => {
			return dayArray.map( (day ) => {
				if (firstMoment.isSame(moments[zone][day][startOrEndMoment])) return true;
				return false;
			} ).reduce( (allEq, eq) => {
				if (allEq && eq) return true;
				return false;
			}, true)
		} ).reduce( (allEqual, equal) => {
			if(allEqual && equal) return true;
			return false;
		}, true);

		return allEq ? firstMoment : null;
	}

	disabledMinutes = () => {
		let disabled = Array.from(new Array(60), (x,i) => {
			if (i % 15 !== 0) return i;
			// return a number that isn't 00, 15, 30, 45
			// to keep compiler from throwing error
			return 14;
		})
		return disabled;
	}

	renderWeeklySchedule = (zones) => {
    const schedules = getSchedulesForCurrentSystem(this.props.deviceShadow);
		let moments = getMomentsForCurrentSchedules(schedules);

		const zoneIds = Object.keys(zones);
		const zoneChoices = ["All", ...zoneIds];
		let zoneArrays = [];
		zoneArrays["All"] = [...zoneIds];
		zoneIds.forEach( (zone) => {
			zoneArrays[zone] = [zone];
		} )

		let dayChoices = ["All", "Weekdays"];
		const days = Object.keys(DAY_NAMES);
		dayChoices = [...dayChoices, ...days];
		let dayArrays = [];
		dayArrays["All"] = [...days];
		dayArrays["Weekdays"] = [...days.slice(0,5)];
		days.forEach( (day) => {
			dayArrays[day] = [day];
		} )

		// add moments for zone:all, day:all,weekdays
		Object.keys(dayArrays).forEach( (dayChoice) => {
			Object.keys(zoneArrays).forEach( (zoneChoice) => {
				if(zoneChoice === "All" || dayChoice === "All" || dayChoice === "Weekdays") {
					moments[zoneChoice] = moments[zoneChoice] || {};
					moments[zoneChoice][dayChoice] = moments[zoneChoice][dayChoice] || {};
					moments[zoneChoice][dayChoice].startMoment = this.allEqual(moments, 'startMoment', zoneArrays[zoneChoice], dayArrays[dayChoice]);
					moments[zoneChoice][dayChoice].endMoment = this.allEqual(moments, 'endMoment', zoneArrays[zoneChoice], dayArrays[dayChoice]);
				}
			} )
		} )

		return (
			<Well>
				<Panel>
					<Table responsive>
						<thead>
							<tr>
								<th key={0} style={{fontSize: '16px'}}>Zone / Day(s)</th>
								{dayChoices.map( (dayChoice, index) => {
									return (
										<th key={index+1} style={{fontSize: '16px'}}>{dayChoice}</th>
									)}
								)}
							</tr>
						</thead>
						<tbody>
							{zoneChoices.map( (zoneChoice, index) => {
								return (
									<tr key={index}>
										<td key={0} style={{fontWeight: 'bold',fontSize: '16px', padding: '16px 8px'}}>{zoneChoice}</td>
										{dayChoices.map( (dayChoice, ind) => {
											return (
												<td key={ind+1} style={{padding: '16px 8px'}}>
													<TimePicker
														use12Hours
														format="h:mm a"
														value={moments[zoneChoice][dayChoice].startMoment}
														placeholder="Occ."
														disabledMinutes={this.disabledMinutes}
														hideDisabledOptions
														onChange={this.onArrayTimeChange.bind(this, moments, 'Occupied', dayArrays[dayChoice], zoneArrays[zoneChoice])} />
													<br />
													<TimePicker
														use12Hours
														format="h:mm a"
														value={moments[zoneChoice][dayChoice].endMoment}
														placeholder="Unocc."
														disabledMinutes={this.disabledMinutes}
														hideDisabledOptions
														onChange={this.onArrayTimeChange.bind(this, moments, 'Unoccupied', dayArrays[dayChoice], zoneArrays[zoneChoice])} />
												</td>
											);
										}
										)}
									</tr>
								)}
							)}
						</tbody>
					</Table>
				</Panel>
			</Well>
		)
	}

	newVacation = (existingKeyArr, dates, dateStrings) => {
		let i = 0;
		console.log(existingKeyArr);
		while (i < 20) {
			console.log("i: ", i);
			if (!existingKeyArr.includes(i.toString())) break;
			i += 1;
		}
		console.log("i: ", i);
		this.updateVacation(i.toString(), dates, dateStrings);
	}
	updateVacation = (vacationKey, dates, dateStrings) => {
		if (dates.length === 0) {
			this.deleteVacation(vacationKey);
		} else {
			this.props.onVacationUpdate(vacationKey, dates);
		}
	}
	deleteVacation = (vacationKey) => {
		this.props.onVacationUpdate(vacationKey, [new moment("1-1", "M-D"), new moment("1-1", "M-D")]);
	}

	renderVacationSchedule = (zones) => {
		const vacations = getVacationsForCurrentSystem(this.props.deviceShadow)
		const vacArr = Array.from(Object.keys(vacations), (key) => {
			return {
				key: key,
				startDate: vacations[key].startDate,
				endDate: vacations[key].endDate,
			}
		})
		vacArr.sort( (a, b) => {
			return b.startDate.isBefore(a.startDate);
		} )
		const numVacs = Object.keys(vacations).length;
		return (
			<Well>
				<Panel>
					<LocaleProvider locale={locales}>
						<Table responsive>
							<thead>
								<tr style={{fontSize: '16px'}}>
									<th>#</th>
									<th>Start Date ~ End Date</th>
								</tr>
							</thead>
							<tbody>
								{numVacs > 0 ?
										vacArr.map( (vac, index) => {
											return (
												<tr key={index}>
													<td style={{fontWeight: 'bold',fontSize: '16px', padding: '16px 8px'}}>{index+1}</td>
													<td style={{padding: '16px 8px'}}>
														<RangePicker value={[vac.startDate, vac.endDate]}
															onChange={this.updateVacation.bind(this,vac.key)} />
														<Button bsStyle="danger" bsSize="small" style={{margin: '0px 20px'}}
															onClick={this.deleteVacation.bind(this,vac.key)}>Remove</Button>
													</td>
												</tr>
											)
										}) : null
								}
								{numVacs < 20 ? (
									<tr>
										<td style={{fontWeight: 'bold',fontSize: '16px', padding: '16px 8px'}}>
											{numVacs+1}
										</td>
										<td style={{padding: '16px 8px'}}>
											<RangePicker value={null} placeholder={["Start date", "End date"]} onChange={this.newVacation.bind(this,Object.keys(vacations))} />
										</td>
									</tr>
								) : null
								}
							</tbody>
						</Table>
					</LocaleProvider>
				</Panel>
			</Well>
		)
	}

	render = () => {
		const zones = getZonesForCurrentSystem(this.props.deviceShadow);

		return (
			<div>
				<UnderDevelopmentBanner />
				<Nav bsStyle="tabs" activeKey={this.state.activeKey} onSelect={this.handleSelect}>
					<NavItem eventKey="1">Weekly Schedule</NavItem>
					<NavItem eventKey="2">Vacations</NavItem>
				</Nav>
				{this.state.activeKey === "1" ? this.renderWeeklySchedule(zones) : this.renderVacationSchedule(zones)}
			</div>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		deviceShadow: state.shadow,
	}
};
const mapDispatchToProps = (dispatch) => {
	return bindActionCreators({
		onZoneUpdate: updateZone,
		onVacationUpdate: updateVacationSchedule
	}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
