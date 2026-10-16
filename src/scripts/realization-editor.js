import '../styles/realization-editor.css';

const config = window.virturaRealizationEditorConfig || {};
const wpApi = window.wp || {};
const createElement = wpApi.element?.createElement;
const registerPlugin = wpApi.plugins?.registerPlugin;
const PluginDocumentSettingPanel = wpApi.editor?.PluginDocumentSettingPanel;
const MediaUpload = wpApi.blockEditor?.MediaUpload;
const MediaUploadCheck = wpApi.blockEditor?.MediaUploadCheck;
const Button = wpApi.components?.Button;
const Spinner = wpApi.components?.Spinner;
const useSelect = wpApi.data?.useSelect;
const useDispatch = wpApi.data?.useDispatch;

const getLabel = (key, fallback) => config.labels?.[key] || fallback;

const getPreviewUrl = (media) => {
  const sizes = media?.media_details?.sizes || {};

  return sizes.medium_large?.source_url
    || sizes.medium?.source_url
    || media?.source_url
    || '';
};

const RealizationLandscapeImagePanel = () => {
  const editorState = useSelect((select) => {
    const editor = select('core/editor');
    const postType = editor.getCurrentPostType();
    const meta = editor.getEditedPostAttribute('meta') || {};
    const imageId = Number(meta[config.metaKey]) || 0;
    const media = imageId ? select('core').getMedia(imageId) : null;

    return { imageId, media, postType };
  }, []);
  const { editPost } = useDispatch('core/editor');

  if (editorState.postType !== config.postType) {
    return null;
  }

  const updateImage = (imageId) => {
    editPost({
      meta: {
        [config.metaKey]: Number(imageId) || 0,
      },
    });
  };
  const previewUrl = getPreviewUrl(editorState.media);
  const mediaControl = createElement(
    MediaUploadCheck,
    null,
    createElement(MediaUpload, {
      allowedTypes: ['image'],
      modalClass: 'virtura-realization-image-modal',
      onSelect: (media) => updateImage(media?.id),
      render: ({ open }) => createElement(
        Button,
        {
          onClick: open,
          variant: editorState.imageId ? 'secondary' : 'primary',
        },
        editorState.imageId
          ? getLabel('replace', 'Zmień zdjęcie')
          : getLabel('choose', 'Wybierz zdjęcie'),
      ),
      title: getLabel('mediaTitle', 'Wybierz zdjęcie 16:9'),
      value: editorState.imageId || undefined,
    }),
  );

  return createElement(
    PluginDocumentSettingPanel,
    {
      className: 'virtura-realization-image-panel',
      name: 'virtura-realization-landscape-image',
      title: getLabel('panelTitle', 'Zdjęcie 16:9'),
    },
    createElement(
      'p',
      { className: 'virtura-realization-image-panel__description' },
      getLabel(
        'description',
        'Poziome zdjęcie realizacji używane w układach 16:9, w rozmiarze 2560 × 1440 px.',
      ),
    ),
    editorState.imageId && !editorState.media
      ? createElement(
        'div',
        {
          'aria-label': getLabel('loading', 'Ładowanie podglądu zdjęcia…'),
          className: 'virtura-realization-image-panel__loading',
          role: 'status',
        },
        createElement(Spinner),
      )
      : null,
    previewUrl
      ? createElement(
        'div',
        { className: 'virtura-realization-image-panel__preview' },
        createElement('img', {
          alt: editorState.media?.alt_text || getLabel('previewAlt', 'Podgląd zdjęcia 16:9'),
          src: previewUrl,
        }),
      )
      : null,
    !editorState.imageId
      ? createElement(
        'p',
        { className: 'virtura-realization-image-panel__empty' },
        getLabel('empty', 'Nie wybrano zdjęcia 16:9.'),
      )
      : null,
    createElement(
      'div',
      { className: 'virtura-realization-image-panel__actions' },
      mediaControl,
      editorState.imageId
        ? createElement(
          Button,
          {
            isDestructive: true,
            onClick: () => updateImage(0),
            variant: 'tertiary',
          },
          getLabel('remove', 'Usuń'),
        )
        : null,
    ),
  );
};

if (
  createElement
  && registerPlugin
  && PluginDocumentSettingPanel
  && MediaUpload
  && MediaUploadCheck
  && Button
  && Spinner
  && useSelect
  && useDispatch
  && config.metaKey
  && config.postType
) {
  registerPlugin('virtura-realization-editor', {
    render: RealizationLandscapeImagePanel,
  });
}
