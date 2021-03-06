import {AwesomeComponent} from '@/component';
import * as Awesome from '@/types';

let _root: Awesome.VDom;

let _state: Awesome.ListNode<any> = {
  value: null,
  future: null,
};

let _effect: Awesome.ListNode<any[] | null> = {
  value: null,
};

let _memo: Awesome.ListNode<any> = {
  value: null,
};

let _callback: Awesome.ListNode<any> = {
  value: null,
};

let _ref: Awesome.ListNode<any> = {
  value: null,
};

let _context: Awesome.ListNode<any> = {
  value: null,
};

// eslint-disable-next-line no-unused-vars
let _stateTail = _state;
// eslint-disable-next-line no-unused-vars
let _effectTail = _effect;
// eslint-disable-next-line no-unused-vars
let _memoTail = _memo;
// eslint-disable-next-line no-unused-vars
let _callbackTail = _callback;
// eslint-disable-next-line no-unused-vars
let _refTail = _ref;
// eslint-disable-next-line no-unused-vars
let _contextTail = _context;

function createRoot(container: Awesome.Container | null): Awesome.VDom {
  _root = {
    parent: null,
    children: [],
    brother: null,
    patches: [],
    props: {},
    dom: container as HTMLElement,
    visitor: 0,
  };
  return _root;
}

function dispatchRoot() {
  return _root;
}

function _appendState(node: Awesome.ListNode<any>) {
  if (node.next == null) {
    node.next = {
      value: null,
      future: null,
      perv: node,
    };
    _stateTail = node.next;
  }
  _state = node.next;
}

function _appendEffect(node: Awesome.ListNode<any[] | null>) {
  if (node.next == null) {
    node.next = {
      value: null,
      perv: node,
    };
    _effectTail = node.next;
  }
  _effect = node.next;
}

function _appendMemo(node: Awesome.ListNode<any[] | null>) {
  if (node.next == null) {
    node.next = {
      value: null,
      perv: node,
    };
    _memoTail = node.next;
  }
  _memo = node.next;
}

function _appendCallback(node: Awesome.ListNode<any[] | null>) {
  if (node.next == null) {
    node.next = {
      value: null,
      perv: node,
    };
    _callbackTail = node.next;
  }
  _callback = node.next;
}

function _appendRef(node: Awesome.ListNode<any>) {
  if (node.next == null) {
    node.next = {
      value: null,
      perv: node,
    };
    _refTail = node.next;
  }
  _ref = node.next;
}

function _appendContext(node: Awesome.ListNode<any>) {
  if (node.next == null) {
    node.next = {
      value: null,
      perv: node,
    };
    _contextTail = node.next;
  }
  _context = node.next;
}

function _getState() {
  return _state;
}

function _getEffect() {
  return _effect;
}

function _getMemo() {
  return _memo;
}

function _getCallback() {
  return _callback;
}

function _getRef() {
  return _ref;
}

function _getContext() {
  return _context;
}

function _getStateTail() {
  return _stateTail;
}

function _getEffectTail() {
  return _effectTail;
}

function _getMemoTail() {
  return _memoTail;
}

function _getCallbackTail() {
  return _callbackTail;
}

function _getRefTail() {
  return _refTail;
}

function _getContextTail() {
  return _contextTail;
}

function _setState(state: Awesome.ListNode<any>) {
  _state = state;
}

function _setEffectHooks(effect: Awesome.ListNode<any[] | null>) {
  _effect = effect;
}

function _setMemo(memo: Awesome.ListNode<any>) {
  _memo = memo;
}

function _setCallback(callback: Awesome.ListNode<any>) {
  _callback = callback;
}

function _setRef(ref: Awesome.ListNode<any>) {
  _ref = ref;
}

function _setContext(context: Awesome.ListNode<any>) {
  _context = context;
}

function dispatchState() {
  return {
    getState: _getState,
    getStateTail: _getStateTail,
    setState: _setState,
    appendState: _appendState,
  };
}

function dispatchEffect() {
  return {
    getEffectHooks: _getEffect,
    getEffectTail: _getEffectTail,
    setEffectHooks: _setEffectHooks,
    appendEffect: _appendEffect,
  };
}

function dispatchMemo() {
  return {
    getMemo: _getMemo,
    getMemoTail: _getMemoTail,
    setMemo: _setMemo,
    appendMemo: _appendMemo,
  };
}

function dispatchCallback() {
  return {
    getCallback: _getCallback,
    getCallbackTail: _getCallbackTail,
    setCallback: _setCallback,
    appendCallback: _appendCallback,
  };
}

function dispatchRef() {
  return {
    getRef: _getRef,
    getRefTail: _getRefTail,
    setRef: _setRef,
    appendRef: _appendRef,
  };
}

function dispatchContext() {
  return {
    getContext: _getContext,
    getContextTail: _getContextTail,
    setContext: _setContext,
    appendContext: _appendContext,
  };
}

function firstChild(node: Awesome.VDom): HTMLElement | null {
  if (node.dom instanceof DocumentFragment) {
    for (const child of node.children) {
      if (typeof child !== 'string') {
        const ret = firstChild(child);
        if (ret) {
          return ret;
        }
      }
    }
    return null;
  } else {
    if (node.dom) {
      return node.dom;
    } else {
      return null;
    }
  }
}

function findParent(node: Awesome.VDom): Awesome.VDom {
  let parent = node;
  while (parent.parent && parent?.dom instanceof DocumentFragment) {
    parent = parent.parent;
  }

  return parent!;
}

function appendNextNode(
    newNode: Awesome.Container,
    parent: Awesome.VDom,
    visitor: number,
) {
  for (let i = visitor; i < parent.children.length; ++ i) {
    const first = firstChild(parent.children[i] as Awesome.VDom);
    if (first) {
      findParent(parent).dom?.insertBefore(newNode, first);
      return;
    }
  }

  if ((!parent.dom || parent.dom instanceof DocumentFragment) && parent.parent) {
    appendNextNode(newNode, parent.parent, parent.visitor + 1);
  } else {
    parent.dom?.appendChild(newNode);
  }
}

function putNearestContext(node: Awesome.VDom, contextNode?: Awesome.ListNode<any>) {
  const Provider = (node.type as typeof AwesomeComponent).contextType?.Provider || contextNode?.value.Provider;
  if (Provider) {
    if (node.instance) {
      if (node.instance?.context !== Reflect.get(Provider as Function, 'value')) {
        node.instance.context = Reflect.get(Provider as Function, 'value');
        return true;
      }
    } else {
      if (contextNode) {
        Reflect.set(contextNode.value, 'value', Reflect.get(Provider as Function, 'value'));
        return true;
      }
    }
  }
  return false;
}

export default {
  createRoot,
  dispatchRoot,
  dispatchState,
  dispatchEffect,
  dispatchMemo,
  dispatchCallback,
  dispatchRef,
  dispatchContext,
  appendNextNode,
  putNearestContext,
};

export {
  createRoot,
  dispatchRoot,
  dispatchState,
  dispatchEffect,
  dispatchMemo,
  dispatchCallback,
  dispatchRef,
  dispatchContext,
  appendNextNode,
  putNearestContext,
};
