import React, { Component } from 'react';

import { parseDeviceShadow } from '../util/deviceShadowUtil';

class ZoneDetail extends Component {
    render() {
        const zoneId = this.props.match.params.zoneId;
        const zoneData = parseDeviceShadow().zones[zoneId];
        return <h1>{JSON.stringify(zoneData)}</h1>
    }
}

export default ZoneDetail;