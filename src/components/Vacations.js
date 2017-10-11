import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Table } from 'react-bootstrap';
import { Button } from 'react-bootstrap';
import { updateVacationSchedule } from '../actions/AppActions';
import { LocaleProvider, DatePicker } from 'antd';
import locales from 'antd/lib/locale-provider/en_US';
import moment from 'moment';

import LoadingIndicator from './LoadingIndicator';
import {
	getVacationsForCurrentSystem,
} from '../util/deviceShadowUtil';

import 'antd/dist/antd.css';  // or 'antd/dist/antd.less'
import './Table.css';
import './Vacations.css';

const { RangePicker } = DatePicker;
moment.locale('en');

class Vacations extends Component {
	newVacation = (existingKeyArr, dates, dateStrings) => {
		let i = 0;
		while (i < 20) {
			if (!existingKeyArr.includes(i.toString())) break;
			i += 1;
		}
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

	render = () => {
		const vacations = getVacationsForCurrentSystem(this.props.deviceShadow)
		if (!vacations) {
			return ( <LoadingIndicator /> );
		}
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
			<LocaleProvider locale={locales}>
				<Table>
					<thead>
						<tr className="vacations-header" style={{fontSize: '16px'}}>
							<th>#</th>
							<th>Start Date ~ End Date</th>
						</tr>
					</thead>
					<tbody>
						{numVacs > 0 ?
								vacArr.map( (vac, index) => {
									return (
										<tr key={index}>
											<td className="vacations-header">{index+1}</td>
											<td>
												<RangePicker value={[vac.startDate, vac.endDate]}
													onChange={(dates, dateStrings) => this.updateVacation(vac.key, dates, dateStrings)} />
												<Button bsStyle="danger" bsSize="small" className="vacations-button"
													onClick={() => this.deleteVacation(vac.key)}>Remove</Button>
											</td>
										</tr>
									)
								}) : null
						}
						{numVacs < 20 ? (
							<tr>
								<td className="vacations-header">
									{numVacs+1}
								</td>
								<td>
									<RangePicker
										value={null}
										placeholder={["Start date", "End date"]}
										onChange={(dates, dateStrings) => this.newVacation(Object.keys(vacations), dates, dateStrings)} />
								</td>
							</tr>
						) : null
						}
					</tbody>
				</Table>
			</LocaleProvider>
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
		onVacationUpdate: updateVacationSchedule
	}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Vacations);
