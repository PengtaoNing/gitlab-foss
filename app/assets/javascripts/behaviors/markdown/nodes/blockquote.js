/* eslint-disable class-methods-use-this */

import { Blockquote as BaseBlockquote } from 'tiptap-extensions';
import { wrappingInputRule } from 'tiptap-commands';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';

// Transforms generated HTML back to GFM for Banzai::Filter::MarkdownFilter
export default class Blockquote extends BaseBlockquote {
  toMarkdown(state, node) {
    if (!node.childCount) return;

    defaultMarkdownSerializer.nodes.blockquote(state, node);
  }

  inputRules({ type }) {
    return [wrappingInputRule(/^\s*>\s$/, type), wrappingInputRule(/^>>>$/, type)];
  }
}
