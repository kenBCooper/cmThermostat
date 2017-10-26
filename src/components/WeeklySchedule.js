import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Table, Glyphicon } from 'react-bootstrap';
import { updateZone } from '../actions/AppActions';
import { TimePicker } from 'antd';

import LoadingIndicator from './LoadingIndicator';
import {
  getZonesForCurrentSystem,
  getSchedulesForCurrentSystem,
	getMomentsForCurrentSchedules,
} from '../util/deviceShadowUtil';
import {
	ALL_DAYS,
	WEEK_DAYS,
  DAY_NAMES,
  WEEK_END_DAY_NAMES,
  WEEK_DAY_NAMES,
  GROUP_DAY_NAMES,
  EXPAND_ON,
  ALL_ZONES,
} from '../constants/ScheduleConstants';

import 'antd/dist/antd.css';  // or 'antd/dist/antd.less'
import './Table.css';
import './WeeklySchedule.css';

const DISABLED_MINUTES = Array.from(new Array(60), (x,i) => {
	if (i % 5 !== 0) return i;
	return 1;
});


class WeeklySchedule extends Component {
	constructor(props) {
		super(props);

		this.state = {
			expandedView: false,
		};
	}

	// given a start or end time and an array of zones and/or days, update the hardware
	onTimeChange = (moments, occOrUnocc, dayChoices, zoneChoices, timeMoment, timeString) => {
		zoneChoices.forEach( (zone) => {
			dayChoices.forEach( (day) => {
				this.changeZoneTime(moments, occOrUnocc, day, zone, timeMoment, timeString);
			});
		});
	}

	// given a start or end time, a zone, and a day, update the hardware
	changeZoneTime = (moments, occOrUnocc, dayChoice, zoneChoice, timeMoment, timeString) => {
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
		if (newTimeMoment === null) return false;
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

	onSetUnoccupied = (dayChoices, zoneChoices) => {
		zoneChoices.forEach( (zone) => {
			dayChoices.forEach( (day) => {
				this.setZoneUnoccupied(day, zone);
			});
		});
	}

	setZoneUnoccupied = (day, zone) => {
		this.props.onZoneUpdate("12", `${DAY_NAMES[day]}OccupiedHour`, zone);
		this.props.onZoneUpdate("01", `${DAY_NAMES[day]}OccupiedMinute`, zone);
		this.props.onZoneUpdate("1", `${DAY_NAMES[day]}OccupiedAmPm`, zone);

		this.props.onZoneUpdate("12", `${DAY_NAMES[day]}UnoccupiedHour`, zone);
		this.props.onZoneUpdate("01", `${DAY_NAMES[day]}UnoccupiedMinute`, zone);
		this.props.onZoneUpdate("1", `${DAY_NAMES[day]}UnoccupiedAmPm`, zone);
	}

	toggleScheduleExpansion = () => {
		this.setState({
			expandedView: !this.state.expandedView
		});
	}

	isUnoccAllDay = (startMoment, endMoment) => {
		return (
			startMoment && endMoment &&
			startMoment.hour() === 12 &&
			startMoment.minute() === 1 &&
			endMoment.hour() === 12 &&
			endMoment.minute() === 1
		);
	}

  renderDayGroupHeaders = (days) => {
    return days.map((day, index) => {
    	if (day === EXPAND_ON) {
    		return (
    			<th className="schedule-expansion-header-item"
    					onClick={this.toggleScheduleExpansion}
    					key={day}>
    				{day}
    				<Glyphicon className="schedule-expansion-arrow"
    									 glyph={this.state.expandedView ? "chevron-left" : "chevron-right"}/>
    			</th>
    		);
    	} else {
	      return (
	        <th key={day}>{day}</th>
	      );
    	}
    });
  }

  renderTimePickerTableCells = (days, dayArrays, zoneChoice, zoneArrays, moments) => {
		return days.map((day, idx) => {
			const startMoment = moments[zoneChoice][day].startMoment;
  		const endMoment = moments[zoneChoice][day].endMoment;
  		const isUnoccAllDay = this.isUnoccAllDay(startMoment, endMoment);

			return (
				<td className="timer-picker-table-cell" key={idx + 1}>
					<TimePicker
						use12Hours
						format="h:mm a"
						value={isUnoccAllDay ? null : startMoment}
						placeholder={isUnoccAllDay ? "Unoccupied" : "Occ Start"}
						disabledMinutes={() => DISABLED_MINUTES}
						hideDisabledOptions
						addon={() => this.renderSetUnoccupiedButton(dayArrays[day], zoneArrays[zoneChoice])}
						onChange={
							this.onTimeChange.bind(this, moments, 'Occupied', dayArrays[day], zoneArrays[zoneChoice])
						} />
					<br />
					<TimePicker
						use12Hours
						format="h:mm a"
						value={isUnoccAllDay ? null : endMoment}
						placeholder={isUnoccAllDay ? "Unoccupied" : "Occ End"}
						disabledMinutes={() => DISABLED_MINUTES}
						hideDisabledOptions
						addon={() => this.renderSetUnoccupiedButton(dayArrays[day], zoneArrays[zoneChoice])}
						onChange={
							this.onTimeChange.bind(this, moments, 'Unoccupied', dayArrays[day], zoneArrays[zoneChoice])
						} />
				</td>
			);
		});
  }

  renderSetUnoccupiedButton = (days, zones) => {
  	return (
  		<button className="set-unocc-button" onClick={() => this.onSetUnoccupied(days, zones)}>
  			Unoccupied All Day
  		</button>
  	);
  }

	render = () => {
		const zones = getZonesForCurrentSystem(this.props.deviceShadow);
		if (!zones || Object.keys(zones).length === 0) {
			return  <LoadingIndicator /> 
		}
    const schedules = getSchedulesForCurrentSystem(this.props.deviceShadow);
		let moments = getMomentsForCurrentSchedules(schedules);

		const zoneIds = Object.keys(zones);
		const zoneChoices = [ALL_ZONES, ...zoneIds];
		let zoneArrays = [];
		zoneArrays[ALL_ZONES] = [...zoneIds];
		zoneIds.forEach( (zone) => {
			zoneArrays[zone] = [zone];
		});

    const weekDays = Object.keys(WEEK_DAY_NAMES);
    const weekEndDays = Object.keys(WEEK_END_DAY_NAMES);

    let dayArrays = [];
    dayArrays[ALL_DAYS] = [...weekDays, ...weekEndDays];
    dayArrays[WEEK_DAYS] = [...weekDays];
    dayArrays[ALL_DAYS].forEach((day) => {
      dayArrays[day] = [day];
    });

		// add moments for zone:all, day:all,weekdays
		Object.keys(dayArrays).forEach( (dayChoice) => {
			Object.keys(zoneArrays).forEach( (zoneChoice) => {
				if(zoneChoice === ALL_ZONES || dayChoice === ALL_DAYS || dayChoice === WEEK_DAYS) {
					moments[zoneChoice] = moments[zoneChoice] || {};
					moments[zoneChoice][dayChoice] = moments[zoneChoice][dayChoice] || {};
					moments[zoneChoice][dayChoice].startMoment =
						this.allEqual(moments, 'startMoment', zoneArrays[zoneChoice], dayArrays[dayChoice]);
					moments[zoneChoice][dayChoice].endMoment =
						this.allEqual(moments, 'endMoment', zoneArrays[zoneChoice], dayArrays[dayChoice]);
				}
			});
		});

		return (
			<Table className="weekly-schedule-table">
				<thead>
					<tr>
						<th key={0}>Zone</th>
						{this.renderDayGroupHeaders(GROUP_DAY_NAMES)}
						{this.state.expandedView ? this.renderDayGroupHeaders(weekDays) : null}
            {this.renderDayGroupHeaders(weekEndDays)}
					</tr>
				</thead>
				<tbody>
					{zoneChoices.map((zoneChoice, index) => {
						return (
							<tr key={index}>
								<td key={0} className="zone-header">{zoneChoice}</td>
								{this.renderTimePickerTableCells(
									GROUP_DAY_NAMES, dayArrays, zoneChoice, zoneArrays, moments)}
								{this.state.expandedView ? this.renderTimePickerTableCells(
									weekDays, dayArrays, zoneChoice, zoneArrays, moments) : null}
								{this.renderTimePickerTableCells(
									weekEndDays, dayArrays, zoneChoice, zoneArrays, moments)}
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
