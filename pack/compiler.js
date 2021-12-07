const {SyncHook} = require('tapable');
const {parseSync, transformFromAstSync, NodePath} = require('@babel/core');
const {default: traverse} = require('@babel/traverse');
const types = require('@babel/types');

const fs = require('fs');
const path = require('path');
const {getEntry, tryExpression, mkdir, getOutput, isExportNode, deleteReferences} = require('./helper');

class Compiler {
  constructor(options) {
    this.options = options;
    this.hooks = {
      run: new SyncHook(['target']),
      emit: new SyncHook(['target']),
      done: new SyncHook(['target']),
    };
    this.entries = new Set();
    this.modules = new Map();
    this.chunks = new Set();
    this.assets = new Set();
    this.files = new Set();
    this.visited = new Set();
    options.plugins.forEach((plugin) => {
      plugin.apply(this);
    });
  }

  _buildModule(modulePath, originModulePath = '', moduleContext = '') {
    const _modulePath = tryExpression(modulePath, originModulePath, this.options.resolve, moduleContext);
    if (this.modules.has(_modulePath)) {
      return this.modules.get(_modulePath);
    }
    let content = fs.readFileSync(
        _modulePath,
        {
          encoding: 'utf-8',
        },
    );

    const module = {
      moduleId: _modulePath,
      dependencies: new Map(),
      name: originModulePath,
      ast: null,
    };
    this.options.loaders.reverse().forEach((item) => {
      if (item.test.test(_modulePath)) {
        content = item.loader(content, _modulePath);
      }
    });
    const ast = parseSync(content, {
      sourceType: 'unambiguous',
      sourceFileName: modulePath,
      presets: ['@babel/preset-env'],
    });
    traverse(ast, {
      Program: (nodePath) => {
        module.ast = nodePath;
      },
      /**
         *
         * @param {NodePath} nodePath
         */
      ImportDeclaration: (nodePath) => {
        const specifiers = nodePath.node.specifiers.filter((specifier) => {
          if (nodePath.scope.getBinding(specifier.local.name).referenced) {
            return true;
          } else {
            return false;
          }
        });
        if (specifiers.length > 0) {
          nodePath.node.specifiers = specifiers;
          const rootPath = modulePath.split('/').slice(0, -1).join('/');
          let subModulePath = path.resolve(rootPath, nodePath.node.source.extra.rawValue);
          subModulePath = this._buildModule(subModulePath, nodePath.node.source.extra.rawValue, _modulePath).moduleId;
          const dependencies = module.dependencies.get(subModulePath) || [];
          specifiers.forEach((specifier) => {
            const dependency = {
              local: specifier.local.name,
              imported: '',
            };
            if (types.isImportSpecifier(specifier)) {
              dependency.imported = specifier.imported.name;
            }
            dependencies.push(dependency);
          });
          module.dependencies.set(subModulePath, dependencies);
        } else {
          nodePath.remove();
        }
      },
      /**
         *
         * @param {NodePath} nodePath
         */
      CallExpression: (nodePath) => {
        if (nodePath.node.callee.name === 'require') {
          const rootPath = modulePath.split('/').slice(0, -1).join('/');
          let subModulePath = path.resolve(rootPath, nodePath.node.arguments[0].value);
          subModulePath = this._buildModule(subModulePath, nodePath.node.arguments[0].value, _modulePath).moduleId;
          const dependencies = module.dependencies.get(subModulePath) || [];
          if (!Array.isArray(nodePath.container)) {
            if (types.isObjectPattern(nodePath.container.id)) {
              for (const property of nodePath.container.id.properties) {
                const dependency = {
                  imported: property.key.name,
                  local: '',
                };
                if (property.value) {
                  dependency.local = property.value.name;
                }
                dependencies.push(dependency);
              }
            } else {
              dependencies.push({
                local: nodePath.container.id.name,
                imported: '',
              });
            }
          }
          module.dependencies.set(subModulePath, dependencies);
        }
      },
    });

    module._source = content;
    this.modules.set(_modulePath, module);
    return module;
  }


  /**
   * @typedef Specifier
   * @type {Object}
   * @property {String} local
   * @property {String} imported
   */
  /**
   * @typedef Module
   * @type {Object}
   * @property {NodePath} ast
   * @property {Map<String, Specifier[]>} dependencies
   * @property {String} name
   * @property {String} moduleId
   */
  /**
   * TreeShaking
   * @param {Module}module
   */
  _treeShaking(module) {
    if (!this.visited.has(module)) {
      this.visited.add(module);
      module.dependencies.forEach((value, key) => {
        /** @type {NodePath} */
        const dependModule = this.modules.get(key);
        value.forEach((dependency) => {
          if (dependency.imported) {
            const name = dependency.local || dependency.imported;
            const binding = dependModule.ast.scope.getBinding(dependency.imported);
            binding.referencePaths =
            binding.referencePaths.concat(module.ast.scope.getBinding(name).referencePaths);
            binding.referenced = true;
            binding.references = binding.referencePaths.length;
          } else {
            const name = dependModule.ast.node.body.find((node) => types.isExportDefaultDeclaration(node)).declaration.name;
            const binding = dependModule.ast.scope.getBinding(name);
            binding.referencePaths =
            binding.referencePaths.concat(module.ast.scope.getBinding(dependency.local).referencePaths);
            binding.referenced = true;
            binding.references = binding.referencePaths.length;
          }
        });
        this._treeShaking(dependModule);
      });
    }
  }

  /**
   *
   * @param {NodePath} module
   */
  _traverse(module) {
    traverse(module.ast.node, {
      /**
       *
       * @param {NodePath} nodePath
       */
      VariableDeclaration: (nodePath) => {
        if (Array.isArray(nodePath.node.declarations)) {
          const declarations = nodePath.node.declarations.filter((declaration) => {
            if (types.isObjectPattern(declaration.id)) {
              for (const property of declaration.id.properties) {
                const referencePaths = nodePath.scope.getBinding(property.key.name).referencePaths;
                if (referencePaths.filter(
                    (node) => !isExportNode(node.container) && !isExportNode(node.node)).length) {
                  return true;
                } else {
                  referencePaths.forEach((node) => {
                    if (!isExportNode(node)) {
                      node.parentPath.remove();
                    } else {
                      node.remove();
                    }
                  });
                  nodePath.shouldStop = true;
                  return false;
                }
              }
            } else if (types.isArrayPattern(declaration.id)) {
              return true;
            } else if (types.isIdentifier(declaration.id)) {
              const referencePaths = nodePath.scope.getBinding(declaration.id.name).referencePaths;
              if (referencePaths.filter(
                  (node) => !isExportNode(node.container) && !isExportNode(node.node)).length) {
                return true;
              } else {
                referencePaths.forEach((node) => {
                  if (!isExportNode(node)) {
                    node.parentPath.remove();
                  } else {
                    node.remove();
                  }
                });
                nodePath.shouldStop = true;
                return false;
              }
            }
          });
          if (declarations.length) {
            nodePath.node.declarations = declarations;
          } else {
            deleteReferences(nodePath);
            nodePath.remove();
          }
          if (nodePath.shouldStop) {
            this._traverse(module);
          }
        }
      },
      /**
       *
       * @param {NodePath} nodePath
       */
      FunctionDeclaration: (nodePath) => {
        const referencePaths = nodePath.scope.getBinding(nodePath.node.id.name).referencePaths;
        if (!referencePaths.filter((node) => !isExportNode(node.container) && !isExportNode(node.node)).length) {
          referencePaths.forEach((node) => {
            if (!isExportNode(node)) {
              node.parentPath.remove();
            } else {
              node.remove();
            }
          });
          nodePath.shouldStop = true;
          nodePath.remove();
          this._traverse(module);
        }
      },
    });
  }

  /**
   *
   * @param {NodePath} module
   */
  _generate(module) {
    traverse(module.ast.node, {
      ImportDeclaration: (nodePath) => {
        nodePath.remove();
      },
      ExportDeclaration: (nodePath) => {
        nodePath.remove();
      },
      ExportDefaultDeclaration: (nodePath) => {
        nodePath.remove();
      },
      ExportAllDeclaration: (nodePath) => {
        nodePath.remove();
      },
      ExportNamedDeclaration: (nodePath) => {
        nodePath.remove();
      },
    });
  }

  _dealEntry() {
    this.entries.forEach((entry) => {
      this._treeShaking(entry);
    });

    this.modules.forEach((module) => {
      this._traverse(module);
      this._generate(module);
      const {code} = transformFromAstSync(module.ast.node, module._source, {
        presets: [['@babel/preset-env', {
          'targets': {
            esmodules: this.options.esmodules,
          },
        }]],
      });
      module._source = code;
    });
  }

  run(callback) {
    this.hooks.run.call(this);
    for (const entry of this.options.input) {
      const entryModule = this._buildModule(getEntry(entry), entry.split('/').slice(-1)[0]);
      this.entries.add(entryModule);
    }

    this._dealEntry();

    const absoluteOutput = getOutput(this.options.output);
    mkdir(absoluteOutput);

    this.hooks.emit.call(this);
    this.modules.forEach((module) => {
      fs.writeFile(path.resolve(
          absoluteOutput,
        /\.js$/.test(module.name) ? module.name : module.name + '.js'),
      module._source, (err) => {
        if (err) {
          console.log(err);
        }
      });
    });
    this.hooks.done.call(this);
    callback && callback();
  }
}

module.exports = Compiler;
