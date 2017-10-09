import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Table } from 'react-bootstrap';
import { updateZone } from '../actions/AppActions';
import { TimePicker } from 'antd';

import LoadingIndicator from './LoadingIndicator';
import {
  getZonesForCurrentSystem,
  getSchedulesForCurrentSystem,
	getMomentsForCurrentSchedules,
} from '../util/deviceShadowUtil';
import { DAY_NAMES } from '../constants/ScheduleConstants';

import 'antd/dist/antd.css';  // or 'antd/dist/antd.less'
import './Table.css';
import './WeeklySchedule.css';

class WeeklySchedule extends Component {
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
		// return an array of numbers that excludes 00, 15, 30, 45
		let disabled = Array.from(new Array(60), (x,i) => {
			if (i % 15 !== 0) return i;
			return 1;
		})
		return disabled;
	}


	render = () => {
		const zones = getZonesForCurrentSystem(this.props.deviceShadow);
		if (!zones || Object.keys(zones).length === 0) {
			return ( <LoadingIndicator /> );
		}
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
					moments[zoneChoice][dayChoice].startMoment =
						this.allEqual(moments, 'startMoment', zoneArrays[zoneChoice], dayArrays[dayChoice]);
					moments[zoneChoice][dayChoice].endMoment =
						this.allEqual(moments, 'endMoment', zoneArrays[zoneChoice], dayArrays[dayChoice]);
				}
			} )
		} )

		return (
			<Table>
				<thead>
					<tr>
						<th key={0}>#</th>
						{dayChoices.map( (dayChoice, index) => {
							return (
								<th key={index+1}>{dayChoice}</th>
							)}
						)}
					</tr>
				</thead>
				<tbody>
					{zoneChoices.map( (zoneChoice, index) => {
						return (
							<tr key={index}>
								<td key={0} className="zone-header">{zoneChoice}</td>
								{dayChoices.map( (dayChoice, ind) => {
									return (
										<td className="timer-picker-table-cell" key={ind+1}>
											<TimePicker
												use12Hours
												format="h:mm a"
												value={moments[zoneChoice][dayChoice].startMoment}
												placeholder="Occ."
												disabledMinutes={this.disabledMinutes}
												hideDisabledOptions
												onChange={
													this.onArrayTimeChange.bind(this, moments, 'Occupied', dayArrays[dayChoice], zoneArrays[zoneChoice])
												} />
											<br />
											<TimePicker
												use12Hours
												format="h:mm a"
												value={moments[zoneChoice][dayChoice].endMoment}
												placeholder="Unocc."
												disabledMinutes={this.disabledMinutes}
												hideDisabledOptions
												onChange={
													this.onArrayTimeChange.bind(this, moments, 'Unoccupied', dayArrays[dayChoice], zoneArrays[zoneChoice])
												} />
										</td>
									);
								}
								)}
							</tr>
						)}
					)}
				</tbody>
			</Table>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		deviceShadow: state.shadow,
	}
};
const mapDispatchToProps = (dispatch) => {
	return bindActionCreators({
		onZoneUpdate: updateZone
	}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(WeeklySchedule);
