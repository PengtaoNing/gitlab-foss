/* eslint-disable class-methods-use-this */

import { Node } from 'tiptap';
import { toggleList, wrappingInputRule } from 'tiptap-commands';

// Transforms generated HTML back to GFM for Banzai::Filter::TaskListFilter
export default class OrderedTaskList extends Node {
  get name() {
    return 'ordered_task_list';
  }

  get schema() {
    return {
      group: 'block',
      content: '(task_list_item|list_item)+',
      parseDOM: [
        {
          priority: 51,
          tag: 'ol.task-list',
        },
      ],
      toDOM: () => ['ol', { class: 'task-list' }, 0],
    };
  }

  toMarkdown(state, node) {
    state.renderList(node, '   ', () => '1. ');
  }

  commands({ type, schema }) {
    return () => toggleList(type, schema.nodes.task_list_item);
  }

  inputRules({ type }) {
    return [wrappingInputRule(/^\s*(\d+)\.\s(\[ \])\s$/, type)];
  }
}
