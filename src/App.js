import React, { Component } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ART,
  Dimensions,
  LayoutAnimation
} from 'react-native';
import geolib from 'geolib';

const {
  Surface,
  Group,
  Shape
} = ART;

const incidents = [
  {
    title: 'Major fire brigade operation',
    latitude: 50.86,
    longitude: -1.28,
    safeDistance: 300,
    warningDistance: 400
  },
  {
    title: 'Aerial bomb defusal',
    latitude: 37.346,
    longitude: -122.043,
    safeDistance: 1950,
    warningDistance: 2250
  }];

class Compass extends Component {
  render() {
    const size = Math.min(Dimensions.get('window').height, Dimensions.get('window').width),
      safeStartAngle = (this.props.safeBearing - this.props.currentHeading) * Math.PI / 180,
      safeEndAngle = (this.props.safeBearing - this.props.currentHeading + 180) * Math.PI / 180,
      safeBearingAngle = this.props.safeBearing * Math.PI / 180,
      center = size / 2,
      radius = center * 0.8,
      safeStartX = center + radius * Math.cos(safeStartAngle),
      safeStartY = center + radius * Math.sin(safeStartAngle),
      safeEndX = center + radius * Math.cos(safeEndAngle),
      safeEndY = center + radius * Math.sin(safeEndAngle),
      safeBearingX = center + radius * Math.cos(safeBearingAngle),
      safeBearingY = center + radius * Math.sin(safeBearingAngle),
      top = center - radius + 2,
      topLength = radius * 0.1;
    return (
      <Surface width={size} height={size}>
        <Group x={0} y={0}>
          <Shape d={`M ${safeStartX} ${safeStartY} A ${radius} ${radius} 0 1 0 ${safeEndX} ${safeEndY}`} stroke='black' strokeWidth={2} fill='green' />
          <Shape d={`M ${safeEndX} ${safeEndY} A ${radius} ${radius} 0 1 0 ${safeStartX} ${safeStartY}`} stroke='black' strokeWidth={2} fill={this.props.backgroundColor} />
          <Shape d={`M ${center} ${top} v ${topLength}`} stroke='black' strokeWidth={5} />
        </Group>
      </Surface>
    )
  }
}

const AnimatedCompass = Animated.createAnimatedComponent(Compass);

class Incident extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentHeading: new Animated.Value(this.normalizeDegrees(props.currentHeading)),
      recommendedBearing: new Animated.Value(this.normalizeDegrees(props.recommendedBearing))
    }
  }

  normalizeDegrees(degrees) {
    if (degrees) {
      const normalizedDegrees = degrees % 360;
      return (normalizedDegrees < 0) ? normalizedDegrees + 360 : normalizedDegrees;
    } else {
      return 0;
    }
  }

  componentWillMount() {
    LayoutAnimation.spring();
  }

  componentWillReceiveProps(nextProps) {
    Animated.parallel([
      Animated.timing(this.state.currentHeading, {
        toValue: this.normalizeDegrees(nextProps.currentHeading),
        duration: 1200
      }),
      Animated.timing(this.state.recommendedBearing, {
        toValue: this.normalizeDegrees(nextProps.recommendedBearing),
        duration : 1200
      })
    ]).start();
  }

  render() {
    let backgroundColor = 'green';
    if (this.props.level > 0) {
      backgroundColor = 'orange';
    };
    if (this.props.level > 1) {
      backgroundColor = 'red';
    };
    let warningText = <Text style={styles.instructions}>You are in a safe area.</Text>;
    let distanceText = [];
    if (this.props.level > 0) {
      warningText =
        <Text style={[styles.instructions, {color: 'darkred'}]}>
          You are close to an area with a public safety warning.
          Keep the indicator in the <Text style={{fontWeight: '900'}}>green half of the circle</Text> to leave this area.
        </Text>;
      distanceText =
        <Text style={styles.instructions}>
          <Text style={{fontWeight: '900'}}>Distance from safe area:{'\n'}</Text>
          <Text>{this.props.distanceFromBorder} meters</Text>
        </Text>;
    }
    if (this.props.level > 1) {
      warningText =
        <Text style={[styles.instructions, {color: 'darkred'}]}>
          You are <Text style={{fontWeight: '900'}}>inside</Text> an area with a public safety warning.
          Keep the indicator in the <Text style={{fontWeight: '900'}}>green half of the circle </Text> and <Text style={{fontWeight: '900'}}>immediately</Text> leave this area.
        </Text>;
      distanceText =
        <Text style={styles.instructions}>
          <Text style={{fontWeight: '900'}}>Distance from safe area:{'\n'}</Text>
          <Text>{this.props.distanceFromBorder} meters</Text>
        </Text>;
    }
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>{this.props.title ? this.props.title : 'No incidents'}</Text>
        {warningText}
        <Text style={styles.instructions}>
          {distanceText}
        </Text>
        {this.props.level > 0 ?
          <AnimatedCompass safeBearing={this.state.recommendedBearing}
            currentHeading={this.state.currentHeading}
            backgroundColor={backgroundColor}/> : []}
      </View>
    )
  }
}

export default class SmartCity extends Component {
  state = {
    initialPosition: {},
    currentPosition: {}
  }

  positionWatch = null;

  componentDidMount() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setState({
          initialPosition: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading
          }})
      }
    );
    this.positionWatch = navigator.geolocation.watchPosition(
      (position) => {
        this.setState({
          currentPosition: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading
          }
        })
      }, () => {}, { enableHighAccuracy: true, maximumAge: 1000, distanceFilter: 1 }
    );
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.positionWatch);
  }

  render() {
    let warnings = [],
     alerts = [],
     nearestIncident = null,
     level = 0,
     title = '',
     recommendedBearing = 0,
     distanceFromBorder = 0;
    if (this.state.currentPosition.latitude) {
      warnings = incidents.filter(
        (incident) => {
          const distance = geolib.getDistance(incident, this.state.currentPosition);
          return distance < incident.warningDistance;
        }
      )
      alerts = warnings.filter(
        (incident) => {
          const distance = geolib.getDistance(incident, this.state.currentPosition);
          return distance < incident.safeDistance;
        }
      )
    }
    if (alerts.length > 0) {
      nearestIncident = alerts[geolib.findNearest(this.state.currentPosition, alerts).key];
      level = 2;
    } else if (warnings.length > 0) {
      nearestIncident = warnings[geolib.findNearest(this.state.currentPosition, warnings).key];
      level = 1;
    }
    if (nearestIncident) {
      title = nearestIncident.title;
      recommendedBearing = geolib.getBearing(nearestIncident, this.state.currentPosition);
      distanceFromBorder = nearestIncident.warningDistance -
        geolib.getDistance(nearestIncident, this.state.currentPosition);
    }
    return (
      <View style={styles.container}>
        <View style={{
          position: 'absolute',
          height: 30, width: 300,
          right: -105, top: 30,
          transform: [{rotate: '45deg'}],
          zIndex: 20,
          backgroundColor: 'white',
          justifyContent: 'center',
          borderColor: 'grey', borderWidth: 1}}>
          <Text style={{textAlign: 'center', color: 'grey'}}>Built in a day</Text>
        </View>
        <Incident level={level}
          title={title}
          recommendedBearing={recommendedBearing}
          distanceFromBorder={distanceFromBorder}
          currentHeading={this.state.currentPosition ? this.state.currentPosition.heading : 0} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    fontWeight: '900'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
});
