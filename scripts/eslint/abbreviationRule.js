import { AST_NODE_TYPES } from '@typescript-eslint/experimental-utils';
import { PatternVisitor } from '@typescript-eslint/scope-manager';

const getIdentifiersFromPattern = pattern => {
  const identifiers = [];
  const visitor = new PatternVisitor({}, pattern, id => identifiers.push(id));
  visitor.visit(pattern);
  return identifiers;
};

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
        category: 'Variables',
        description: 'Enforces fully expanded variable names without common abbreviations',
        recommended: false,
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const abbreviations = {
      opts: 'options',
      ctx: 'context',
      deps: 'dependencies',
      dep: 'dependency',
      ops: 'operations',
      op: 'operation',
      prev: 'previous',
      doc: 'document',
    };

    const abbreviationRe = new RegExp(
      // Match either the non-capitalised abbreviation at the beginning or any capitalised abbreviation in the variable name
      // or at the end of the name
      Object.keys(abbreviations)
        .map(abbreviation => {
          const capitalised = abbreviation[0].toUpperCase() + abbreviation.slice(1);
          return `^${abbreviation}|${capitalised}(?=$|[A-Z])`;
        })
        .join('|'),
      'g'
    );

    const replaceAbbreviation = id =>
      id.replace(abbreviationRe, abbreviation => {
        let expanded = abbreviations[abbreviation.toLowerCase()];
        if (!expanded) {
          return abbreviation;
        } else if (abbreviation[0].toUpperCase() === abbreviation[0]) {
          expanded = expanded[0].toUpperCase() + expanded.slice(1);
        }

        return expanded;
      });

    return {
      // parameters
      'FunctionDeclaration, TSDeclareFunction, TSEmptyBodyFunctionExpression, FunctionExpression, ArrowFunctionExpression'(node) {
        node.params.forEach(param => {
          if (param.type === AST_NODE_TYPES.TSParameterProperty) return;

          const identifiers = getIdentifiersFromPattern(param);

          identifiers.forEach(i => {
            const modifiers = new Set();

            if (isDestructured(i)) {
              modifiers.add(Modifiers.destructured);
            }

            if (isUnused(i.name)) {
              modifiers.add(Modifiers.unused);
            }

            validator(i, modifiers);
          });
        });
      },
    };
  },
};
