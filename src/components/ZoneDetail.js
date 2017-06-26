import React, { Component } from 'react';
import { connect } from 'react-redux';

import LoadingIndicator from './LoadingIndicator';

class ZoneDetail extends Component {
    render() {
        const zoneId = this.props.match.params.zoneId;
        if (this.props.zones && this.props.zones[zoneId]) {
            const zoneData = this.props.zones[zoneId];
            return (
              <div>
                <h1>Name: {zoneId}</h1>
                <h1>Temp: {zoneData.currentTemp}</h1>
                {this.renderTempSetpoints()}
              </div>
            );
        } else {
            return <LoadingIndicator />;
        }
    }

    renderTempSetpoints = () => {
      return null;
    }
}

const mapStateToProps = (state) => {
    return {
        zones: state.shadow.zones,
    }
}

export default connect(mapStateToProps, undefined)(ZoneDetail);