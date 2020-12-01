import { StatusBar } from "expo-status-bar";
import React, { createRef } from "react";
import {
  Animated,
  Button,
  FlatList,
  PanResponder,
  PanResponderInstance,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function immutableMove(arr, from, to) {
  return arr.reduce((prev, current, idx, self) => {
    if (from === to) {
      prev.push(current);
    }
    if (idx === from) {
      return prev;
    }
    if (from < to) {
      prev.push(current);
    }
    if (idx === to) {
      prev.push(self[from]);
    }
    if (from > to) {
      prev.push(current);
    }
    return prev;
  }, []);
}

const colorMap = {};

export default class App extends React.Component {
  state = {
    dragging: false,
    draggingIndex: -1,
    data: Array.from(Array(200), (_, i) => {
      colorMap[i] = getRandomColor();
      return i;
    }),
  };

  _panResponder: PanResponderInstance;
  point = new Animated.ValueXY();
  currentY = 0;
  scrollOffset = 0;
  flatlistTopOffset = 0;
  rowHeight = 0;
  currentIndex = -1;
  active = false;
  flatList = createRef<FlatList<any>>();
  flatListHeight = 0;

  constructor(props) {
    super(props);

    this._panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        this.currentIndex = this.yToIndex(gestureState.y0);
        this.currentY = gestureState.y0;
        Animated.event([{ y: this.point.y }])({
          y: gestureState.y0 - this.rowHeight / 2,
        });
        this.active = true;
        this.setState(
          { dragging: true, dragginIndex: this.currentIndex },
          () => {
            this.animateList();
          }
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        this.currentY = gestureState.moveY;
        Animated.event([{ y: this.point.y }])({ y: gestureState.moveY });
      },
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        // Release the dragged div
        this.reset();
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // Another component has become the responder, so this gesture
        // should be cancelled
      },
      onShouldBlockNativeResponder: (evt, gestureState) => {
        // Returns whether this component should block native components from becoming the JS
        // responder. Returns true by default. Is currently only supported on android.
        return true;
      },
    });
  }

  animateList = () => {
    if (!this.active) {
      return;
    }

    requestAnimationFrame(() => {
      // Check if we are near the bottom or top
      if (this.currentY + 300 > this.flatListHeight) {
        this.flatList.current?.scrollToOffset({
          offset: this.scrollOffset + 5,
          animated: false,
        });
      } else if (this.currentY < 100) {
        this.flatList.current?.scrollToOffset({
          offset: this.scrollOffset - 20,
          animated: false,
        });
      }
      // Check y value, see if we need to re-order
      const newIdx = this.yToIndex(this.currentY);
      if (this.currentIndex != newIdx) {
        this.setState({
          data: immutableMove(this.state.data, this.currentIndex, newIdx),
          draggingIndex: newIdx,
        });
        this.currentIndex = newIdx;
      }
      this.animateList();
    });
  };

  yToIndex = (y: number) => {
    const value = Math.floor(
      (this.scrollOffset + y - this.flatlistTopOffset) / this.rowHeight
    );

    // Boundary checks
    if (value < 0) {
      return 0;
    }
    if (value > this.state.data.length - 1) {
      return this.state.data.length - 1;
    }

    return value;
  };

  reset = () => {
    this.active = false;
    this.setState({ dragging: false, draggingIndex: -1 });
  };

  render() {
    const { data, dragging, draggingIndex } = this.state;

    const renderItem = ({ item, index }, noPanResponder = false) => (
      <View
        onLayout={(e) => {
          this.rowHeight = e.nativeEvent.layout.height;
        }}
        style={{
          padding: 16,
          backgroundColor: colorMap[item],
          flexDirection: "row",
          opacity: draggingIndex === index ? 0 : 1,
        }}
      >
        <View {...(noPanResponder ? {} : this._panResponder.panHandlers)}>
          <Text style={{ fontSize: 28 }}>@</Text>
        </View>
        <Text style={{ fontSize: 22, textAlign: "center", flex: 1 }}>
          {item}
        </Text>
      </View>
    );

    return (
      <SafeAreaView style={styles.container}>
        {dragging && (
          <Animated.View
            style={{
              position: "absolute",
              backgroundColor: "black",
              zIndex: 2,
              height: 20,
              width: "100%",
              top: this.point.getLayout().top,
            }}
          >
            {renderItem({ item: data[draggingIndex], index: -1 }, true)}
          </Animated.View>
        )}
        <FlatList
          ref={this.flatList}
          scrollEnabled={!dragging}
          style={{ width: "100%" }}
          data={data}
          renderItem={renderItem}
          onScroll={(e) => {
            this.scrollOffset = e.nativeEvent.contentOffset.y;
          }}
          onLayout={(e) => {
            this.flatlistTopOffset = e.nativeEvent.layout.y;
            this.flatListHeight = e.nativeEvent.layout.height;
          }}
          scrollEventThrottle={16}
          keyExtractor={(item) => "" + item}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
