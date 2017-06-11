import React, { Component } from 'react';
import { connect } from 'react-redux';

import { parseDeviceShadow } from '../util/deviceShadowUtil';
import './ZoneList.css';

const ZONE_LIST_HEADERS = {
    NAME: 'Name',
    TEMP: 'Temp',
    OCC_HEAT_COOL_SETPOINTS: 'Occupied Heat / Cool',
    UNOCC_HEAT_COOL_SETPOINTS: 'Unoccupied Heat / Cool',
}

class ZoneList extends Component {
    mapZonesDataToDisplayGrid(zonesData) {
        let mappedZoneData = [];
        zonesData.forEach((zoneData) => {
            mappedZoneData.push({
                [ZONE_LIST_HEADERS.NAME]: zoneData.name,
                [ZONE_LIST_HEADERS.TEMP]: zoneData.temp,
                [ZONE_LIST_HEADERS.OCC_HEAT_COOL_SETPOINTS]: 
                    zoneData.occupiedHeatSetpoint + ' / ' + zoneData.occupiedCoolSetpoint,
                [ZONE_LIST_HEADERS.UNOCC_HEAT_COOL_SETPOINTS]:
                    zoneData.occupiedHeatSetpoint + ' / ' + zoneData.occupiedCoolSetpoint,
            });
        })

        return mappedZoneData;
    }

    openZoneDetail(index) {
        this.props.history.push(`/${index}`)
    }

    render() {
        console.log(this.props);
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
        zones: state.zones,
    }
}

export default connect(mapStateToProps, undefined)(ZoneList);
