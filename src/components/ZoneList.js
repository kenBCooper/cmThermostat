import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Table } from 'react-bootstrap';

import LoadingIndicator from './LoadingIndicator';
import {
  selectZonesForCurrentSystem,
  selectIsCurrentSystemCelsius,
  selectNamesForCurrentSystem,
} from '../selectors/AppSelectors';
import { formatTemp } from '../util/tempUtil';
import ThermostatActionIcon from './ThermostatActionIcon';
import ZoneDetail from './ZoneDetail';

import './Table.css';

const ZONE_LIST_HEADERS = {
    ZONE: 'Zone',
    TEMP: 'Temp',
    CURR_ACTION: 'Operation',
    OCC_HEAT_COOL_SETPOINTS: 'Occupied Heat / Cool',
    UNOCC_HEAT_COOL_SETPOINTS: 'Unoccupied Heat / Cool',
    SA_STAT: 'SA Stat',
}

class ZoneList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showZoneDetail: false,
      zoneDetailNumber: undefined,
    };
  }

  mapZonesDataToDisplayGrid(zonesData) {
    let mappedZoneData = [];

    Object.keys(zonesData).forEach((zoneNumber) => {
      mappedZoneData.push({
        [ZONE_LIST_HEADERS.ZONE]: this.props.zoneNames[zoneNumber],
        [ZONE_LIST_HEADERS.TEMP]: formatTemp(
            zonesData[zoneNumber].currentTemp,
            this.props.isCelsius,
          ),
        [ZONE_LIST_HEADERS.CURR_ACTION]:
          this.formatActionDisplay(zonesData[zoneNumber]),
        [ZONE_LIST_HEADERS.OCC_HEAT_COOL_SETPOINTS]:
          this.formatOccupiedSetpoints(
            zonesData[zoneNumber].occupiedHeat,
            zonesData[zoneNumber].occupiedCool,
						zonesData[zoneNumber].occupiedStatus,
          ),
        [ZONE_LIST_HEADERS.UNOCC_HEAT_COOL_SETPOINTS]:
          this.formatUnoccupiedSetpoints(
            zonesData[zoneNumber].unoccupiedHeat,
            zonesData[zoneNumber].unoccupiedCool,
            zonesData[zoneNumber].occupiedStatus,
          ),
        [ZONE_LIST_HEADERS.SA_STAT]:
          zonesData[zoneNumber].standaloneThermostat === '2' ? 'Y' : 'N',
      });
    });

    return mappedZoneData;
  }

  formatActionDisplay(zoneData) {
    return <ThermostatActionIcon small zoneData={zoneData}/>;
  }

  formatOccupiedSetpoints(heatPoint, coolPoint, isOccupied) {
    const isCelsius = this.props.isCelsius;
    return (
      <div className={(isOccupied === '1') ? 'bold' : ''}>
        {formatTemp(heatPoint, isCelsius)} / {formatTemp(coolPoint, isCelsius)}
      </div>
    );
  }

  formatUnoccupiedSetpoints(heatPoint, coolPoint, isOccupied) {
    const isCelsius = this.props.isCelsius;
    return (
      <div className={(isOccupied === '0') ? 'bold' : ''}>
        {formatTemp(heatPoint, isCelsius)} / {formatTemp(coolPoint, isCelsius)}
      </div>
    );
  }

  openZoneDetail(zoneId) {
    this.setState({
      zoneDetailNumber: zoneId,
      showZoneDetail: true,
    });
  }

  closeZoneDetail = () => {
    this.setState({
      showZoneDetail: false,
    });
  }

  render() {
    const zones = this.props.zones;
    const zonesData = this.mapZonesDataToDisplayGrid(zones);
    return (
      <div>
        <Table className="custom-table">
          {this.renderTableHeader(Object.values(ZONE_LIST_HEADERS))}
          {this.renderTableBody(zonesData)}
        </Table>
        <ZoneDetail zoneData={zones[this.state.zoneDetailNumber]}
                    zoneId={this.state.zoneDetailNumber}
                    show={this.state.showZoneDetail}
                    onHide={this.closeZoneDetail}
                    isCelsius={this.props.isCelsius}/>
      </div>
    );
  }

  renderTableHeader(headerItems) {
    return (
      <thead className="custom-table-heading">
        <tr>
        {headerItems.map((headerItem, index) => {
          return (
            <th key={'zoneHeader' + index}
              className="custom-table-heading-cell">
              <span>{headerItem}</span>
            </th>
          );
        })}
        </tr>
      </thead>
    );
  }

  renderTableBody(tableData) {
    return (
      <tbody>
        {tableData.map((tableRowData, rowIndex) => {
          return (
            <tr key={'zoneRow' + rowIndex}
              className="custom-table-row table-hover-color"
              onClick={() => this.openZoneDetail(rowIndex + 1)}>
              {Object.values(tableRowData).map((rowDataItem, cellIndex) => {
                return (
                  <td key={'zoneData' + rowIndex + cellIndex} className="custom-table-cell">
                    {rowDataItem}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    zones: selectZonesForCurrentSystem(state),
    isCelsius: selectIsCurrentSystemCelsius(state),
    zoneNames: selectNamesForCurrentSystem(state),
  }
}

export default connect(mapStateToProps, undefined)(ZoneList);
