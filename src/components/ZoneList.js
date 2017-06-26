import React, { Component } from 'react';
import { connect } from 'react-redux';

import './ZoneList.css';
import LoadingIndicator from './LoadingIndicator';

const ZONE_LIST_HEADERS = {
    NAME: 'Name',
    TEMP: 'Temp',
    OCC_HEAT_COOL_SETPOINTS: 'Occupied Heat / Cool',
    UNOCC_HEAT_COOL_SETPOINTS: 'Unoccupied Heat / Cool',
}

class ZoneList extends Component {
    mapZonesDataToDisplayGrid(zonesData) {
        let mappedZoneData = [];

        Object.keys(zonesData).forEach((zoneNumber) => {
            mappedZoneData.push({
                [ZONE_LIST_HEADERS.NAME]: zoneNumber,
                [ZONE_LIST_HEADERS.TEMP]: zonesData[zoneNumber].currentTemp,
                [ZONE_LIST_HEADERS.OCC_HEAT_COOL_SETPOINTS]: 
                    zonesData[zoneNumber].occupiedHeat + ' / ' + zonesData[zoneNumber].occupiedCool,
                [ZONE_LIST_HEADERS.UNOCC_HEAT_COOL_SETPOINTS]:
                    zonesData[zoneNumber].unoccupiedHeat + ' / ' + zonesData[zoneNumber].unoccupiedCool,
            });
        });

        return mappedZoneData;
    }

    openZoneDetail(index) {
        this.props.history.push(`/${index + 1}`)
    }

    render() {
        if (!this.props.connected || !this.props.zones) {
            return <LoadingIndicator />
        } else {
            if (this.props.zones) {
                const zonesData = this.mapZonesDataToDisplayGrid(this.props.zones);
                return (
                    <div>
                        <table className="zones-table">
                            {this.renderTableHeader(Object.values(ZONE_LIST_HEADERS))}
                            {this.renderTableBody(zonesData)}
                        </table>
                    </div>
                );
            } else {
                return <div></div>
            }
        }
    }

    renderTableHeader(headerItems) {
        return (
            <thead className="zones-table-heading">
                <tr>
                {headerItems.map((headerItem, index) => {
                    return (
                        <th key={'zoneHeader' + index}
                            className="zones-table-heading-cell">
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
                            className="zones-table-row"
                            onClick={() => this.openZoneDetail(rowIndex)}>
                            {Object.values(tableRowData).map((rowDataItem, cellIndex) => {
                                return <td key={'zoneData' + rowIndex + cellIndex} 
                                           className="zones-table-cell">
                                            {rowDataItem}
                                        </td>
                            })}
                        </tr>
                    )
                })}
            </tbody>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        zones: state.shadow.zones,
        connected: state.connected,
    }
}

export default connect(mapStateToProps, undefined)(ZoneList);
