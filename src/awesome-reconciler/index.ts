import * as Awesome from '@/types';
import {AwesomeComponent} from '@/component';

let root: Awesome.VDom;

function createRoot(container: Awesome.Container | null): Awesome.VDom {
  root = {
    parent: null,
    children: [],
    brother: null,
    patches: [],
    props: {},
    dom: container as HTMLElement,
    stateMap: new Map<number, Awesome.VDom>(),
  };
  return root;
}

function dispatchRoot() {
  return root;
}

function build(
    element: Awesome.DOMElement<Awesome.DOMAttributes<Element>, Element> | Awesome.AwesomeElement | Awesome.Node,
    parent: Awesome.VDom | null = null,
    i: number = 0,
    old?: Awesome.VDom,
): Awesome.VDom | null {
  if (!element || typeof element !== 'object') {
    if (element && parent) {
      const el: Awesome.VDom = {
        parent,
        children: String(element),
        brother: parent && Array.isArray(parent.children) && i > 0 ? parent.children[i - 1] : null,
        props: null,
        patches: [],
      };
      (parent.children as Awesome.VDom[]).push(el);
      return el;
    }
  } else if ('type' in element) {
    const type = element.type as any;
    const el: Awesome.VDom = {
      type,
      parent,
      children: [],
      brother: parent && Array.isArray(parent.children) && i > 0 ? parent.children[i - 1] : null,
      props: element.props,
      patches: [],
    };
    if (typeof type === 'function') {
      if (type.prototype instanceof AwesomeComponent) {
        const Type = type as new(props: any) => AwesomeComponent;
        if (old && old.type === element.type) {
          el.instance = old.instance!;
        } else {
          el.instance = new Type(element.props);
          el.instance._node = el;
        }
        build(el.instance.render(), el, 0, old && Array.isArray(old.children) ? old.children[i] : undefined);
      } else {
        if (old) {
          el.stateIndex = old.stateIndex;
          el.effectIndex = old.effectIndex;
          el.stateLength = old.stateLength!;
          el.effectLength = old.effectLength!;
        }
        if (el.stateIndex == null) {
          el.stateIndex = getStateStartIndex();
        }
        if (el.effectIndex == null) {
          el.effectIndex = getEffectStartIndex();
        }
        _stateIndex = el.stateIndex!;
        _effectIndex = el.effectIndex!;

        dispatchRoot().stateMap?.set(el.stateIndex!, el);
        const functionComponent = (type as ((props: any) => Awesome.AwesomeElement<any, any> | null))(element.props);
        if (el.stateLength == null) {
          el.stateLength = getStateStartIndex() - el.stateIndex!;
        }
        if (el.effectLength == null) {
          el.effectLength = getEffectStartIndex() - el.effectIndex!;
        }
        build(functionComponent, el, 0, old && Array.isArray(old.children) ? old.children[i] : undefined);
      }
    } else if (element.props && element.props.children) {
      if (Array.isArray(element.props.children) && el) {
        let _i = 0;
        for (const child of element.props.children) {
          build(child as Awesome.DOMElement<Awesome.DOMAttributes<Element>, Element>, el, _i, old && Array.isArray(old.children) ? old.children[_i] : undefined);
          ++ _i;
        }
      }
    }

    if (el && parent) {
      (parent.children as Awesome.VDom[]).push(el);
    }

    return el;
  } else if (Array.isArray(element)) {
    let _i = 0;
    for (const child of element) {
      build(child as Awesome.DOMElement<Awesome.DOMAttributes<Element>, Element>, parent, _i, old && Array.isArray(old.children) ? old.children[_i] : undefined);
      ++ _i;
    }
  }

  return null;
}

const _state: any[] = [];
const _effectHooks: any[][] = [];
let _effectIndex = 0;
let _stateIndex = 0;

function getStateStartIndex() {
  return _state.length;
}
function getEffectStartIndex() {
  return _effectHooks.length;
}

function dispatchState() {
  return {
    state: _state,
    index: _stateIndex,
    setStateIndex: (val: number) => {
      _stateIndex = val;
      return val;
    },
  };
}

function dispatchEffect() {
  return {
    effectHooks: _effectHooks,
    effectIndex: _effectIndex,
    setEffectIndex: (val: number) => {
      _effectIndex = val;
      return val;
    },
  };
}

export default {
  build,
  dispatchState,
  getStateStartIndex,
  createRoot,
  dispatchRoot,
  dispatchEffect,
  getEffectStartIndex,
};