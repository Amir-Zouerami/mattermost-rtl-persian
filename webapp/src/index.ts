import styles from './styles.css?raw';
import fontUrl from './fonts/Vazirmatn-Variable.woff2?url';

const PLUGIN_ID = 'dev.zouerami.mattermost-rtl-persian';
const STYLE_ID = 'mm-rtl-persian-styles';
const STORAGE_PREFIX = 'mm-rtl-persian-enabled';

type TextDirection = 'rtl' | 'ltr' | 'neutral';

const LETTER_REGEX = /\p{L}/u;
const GENERATED_CLASS_NAMES = [
	'mm-rtl-persian-post',
	'mm-rtl-persian-ltr-post',
	'mm-rtl-persian-persian-post',
	'mm-rtl-persian-neutral-post',
	'mm-rtl-persian-rtl-block',
	'mm-rtl-persian-ltr-block',
	'mm-rtl-persian-neutral-block',
];

const DIRECTION_CLASS_BY_DIRECTION: Record<TextDirection, string> = {
	rtl: 'mm-rtl-persian-rtl-block',
	ltr: 'mm-rtl-persian-ltr-block',
	neutral: 'mm-rtl-persian-neutral-block',
};

const IGNORED_DIRECTION_SELECTOR = 'pre, code, kbd, samp, script, style';

const DIRECTION_TARGETS = [
	'.post-message__text',
	'#post_textbox',
	'#reply_textbox',
	'#edit_textbox',

	'.focalboard-body .Editable',
	'.focalboard-body textarea',
	'.focalboard-body input.Editable',
	'.focalboard-body .octo-editor-preview',
	'.focalboard-body .octo-editor-preview p',
	'.focalboard-body .MarkdownEditor',
	'.focalboard-body .comment-markdown',
	'.focalboard-body .comment-markdown p',
];

const BLOCK_DIRECTION_TARGETS = [
	'.post-message__text > h1',
	'.post-message__text > h2',
	'.post-message__text > h3',
	'.post-message__text > h4',
	'.post-message__text > h5',
	'.post-message__text > h6',
	'.post-message__text > p',
	'.post-message__text > ul.markdown__list',
	'.post-message__text > ol.markdown__list',
	'.post-message__text li',
	'.post-message__text blockquote',
	'.post-message__text blockquote p',
	'.post-message__text .table-responsive',
	'.post-message__text .markdown__table th',
	'.post-message__text .markdown__table td',
];

const PERSIAN_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});

const PERSIAN_TIME_FORMATTER = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
});

const PERSIAN_RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('fa-IR', {
	numeric: 'auto',
	style: 'long',
});

const ENGLISH_RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', {
	numeric: 'auto',
	style: 'long',
});

declare global {
	interface Window {
		registerPlugin?: (id: string, plugin: Plugin) => void;
	}
}

type PluginRegistry = {
	registerMainMenuAction?: (text: string, action: () => void, mobileIcon?: unknown) => string;
};

type ReduxStore = {
	getState?: () => {
		entities?: {
			users?: {
				currentUserId?: string;
			};
		};
	};
};

function formatPersianDate(date: Date) {
	const parts = PERSIAN_DATE_PARTS_FORMATTER.formatToParts(date);

	const weekday = parts.find(part => part.type === 'weekday')?.value ?? '';
	const day = parts.find(part => part.type === 'day')?.value ?? '';
	const month = parts.find(part => part.type === 'month')?.value ?? '';
	const year = parts.find(part => part.type === 'year')?.value ?? '';

	return `${weekday} ${day} ${month} ${year}`;
}

function formatRelativeTime(date: Date, locale: 'fa' | 'en') {
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	const absSeconds = Math.abs(diffSeconds);

	const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		['year', 60 * 60 * 24 * 365],
		['month', 60 * 60 * 24 * 30],
		['week', 60 * 60 * 24 * 7],
		['day', 60 * 60 * 24],
		['hour', 60 * 60],
		['minute', 60],
		['second', 1],
	];

	const [unit, secondsInUnit] = divisions.find(([, seconds]) => absSeconds >= seconds) ?? ['second', 1];

	const value = Math.round(diffSeconds / secondsInUnit);
	const formatter = locale === 'fa' ? PERSIAN_RELATIVE_TIME_FORMATTER : ENGLISH_RELATIVE_TIME_FORMATTER;

	return formatter.format(value, unit);
}

function isArabicIndicDigit(codePoint: number) {
	return (codePoint >= 0x0660 && codePoint <= 0x0669) || (codePoint >= 0x06F0 && codePoint <= 0x06F9);
}

function isRtlStrongCharacter(character: string) {
	const codePoint = character.codePointAt(0);

	if (codePoint === undefined || isArabicIndicDigit(codePoint)) {
		return false;
	}

	return (
		(codePoint >= 0x0590 && codePoint <= 0x05FF) ||
		(codePoint >= 0x0600 && codePoint <= 0x06FF) ||
		(codePoint >= 0x0750 && codePoint <= 0x077F) ||
		(codePoint >= 0x08A0 && codePoint <= 0x08FF) ||
		(codePoint >= 0xFB1D && codePoint <= 0xFDFD) ||
		(codePoint >= 0xFE70 && codePoint <= 0xFEFC)
	);
}

function getStrongTextStats(text: string) {
	let rtl = 0;
	let ltr = 0;
	let firstDirection: TextDirection = 'neutral';

	for (const character of text) {
		if (isRtlStrongCharacter(character)) {
			rtl += 1;
			firstDirection = firstDirection === 'neutral' ? 'rtl' : firstDirection;
			continue;
		}

		if (LETTER_REGEX.test(character)) {
			ltr += 1;
			firstDirection = firstDirection === 'neutral' ? 'ltr' : firstDirection;
		}
	}

	return {rtl, ltr, firstDirection};
}

function startsWithShortTechnicalLtrTokenFollowedByRtl(text: string) {
	const match = /^[\s`*_~>\-•()[\]{}'"“”‘’.,:;!?]*[A-Za-z][A-Za-z0-9_.#/+:-]{0,5}\s+/u.exec(text);

	if (!match) {
		return false;
	}

	return hasRtlStrongText(text.slice(match[0].length));
}

function getTextDirection(text: string): TextDirection {
	const stats = getStrongTextStats(text);

	if (stats.firstDirection === 'neutral') {
		return 'neutral';
	}

	if (
		stats.firstDirection === 'ltr' &&
		stats.rtl > stats.ltr &&
		startsWithShortTechnicalLtrTokenFollowedByRtl(text)
	) {
		return 'rtl';
	}

	return stats.firstDirection;
}

function hasRtlStrongText(text: string) {
	return getStrongTextStats(text).rtl > 0;
}

function hasLetter(text: string) {
	return LETTER_REGEX.test(text);
}

function getDirectionalText(element: HTMLElement) {
	let text = '';
	const walker = document.createTreeWalker(
		element,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				const parent = node.parentElement;

				if (parent?.closest(IGNORED_DIRECTION_SELECTOR)) {
					return NodeFilter.FILTER_REJECT;
				}

				return NodeFilter.FILTER_ACCEPT;
			},
		},
	);

	let node = walker.nextNode();

	while (node) {
		text += `${node.textContent ?? ''} `;
		node = walker.nextNode();
	}

	return text.replace(/\s+/g, ' ').trim();
}

function setDirectionalClass(element: HTMLElement, direction: TextDirection) {
	element.classList.remove('mm-rtl-persian-rtl-block', 'mm-rtl-persian-ltr-block', 'mm-rtl-persian-neutral-block');
	element.classList.add(DIRECTION_CLASS_BY_DIRECTION[direction]);

	if (direction === 'neutral') {
		element.removeAttribute('dir');
		return;
	}

	element.setAttribute('dir', direction);
}

class Plugin {
	private observer?: MutationObserver;
	private relativeTimeInterval?: number;
	private scheduled = false;
	private storageKey = `${STORAGE_PREFIX}:unknown`;

	public initialize(registry?: PluginRegistry, store?: ReduxStore) {
		const currentUserId = store?.getState?.()?.entities?.users?.currentUserId ?? 'unknown';
		this.storageKey = `${STORAGE_PREFIX}:${currentUserId}`;

		this.injectStyles();

		registry?.registerMainMenuAction?.('Toggle Persian RTL', () => {
			this.setEnabled(!this.isEnabled());
		});

		this.setEnabled(this.isEnabled());

		this.observer = new MutationObserver(() => {
			this.scheduleApply();
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	public uninitialize() {
		this.observer?.disconnect();

		if (this.relativeTimeInterval) {
			window.clearInterval(this.relativeTimeInterval);
			this.relativeTimeInterval = undefined;
		}

		document.body.classList.remove('mm-rtl-persian-enabled');
		document.getElementById(STYLE_ID)?.remove();
		this.restoreTimestamps();
		this.removeGeneratedClasses();
	}

	private injectStyles() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = styles.replaceAll('__MM_RTL_PERSIAN_FONT_URL__', fontUrl);
		document.head.appendChild(style);
	}

	private isEnabled() {
		return localStorage.getItem(this.storageKey) !== 'false';
	}

	private setEnabled(enabled: boolean) {
		localStorage.setItem(this.storageKey, String(enabled));
		document.body.classList.toggle('mm-rtl-persian-enabled', enabled);

		if (enabled) {
			if (!this.relativeTimeInterval) {
				this.relativeTimeInterval = window.setInterval(() => {
					this.scheduleApply();
				}, 60_000);
			}

			this.apply();
			return;
		}

		if (this.relativeTimeInterval) {
			window.clearInterval(this.relativeTimeInterval);
			this.relativeTimeInterval = undefined;
		}

		this.restoreTimestamps();
		this.removeGeneratedClasses();
	}

	private scheduleApply() {
		if (this.scheduled || !this.isEnabled()) {
			return;
		}

		this.scheduled = true;

		window.requestAnimationFrame(() => {
			this.scheduled = false;
			this.apply();
		});
	}

	private apply() {
		this.applyDirectionAttributes(document.body);
		this.classifyPosts();
		this.classifyDirectionalBlocks();
		this.localizeTimestamps();
	}

	private applyDirectionAttributes(root: ParentNode) {
		root.querySelectorAll<HTMLElement>(DIRECTION_TARGETS.join(',')).forEach(element => {
			if (!element.hasAttribute('dir')) {
				element.setAttribute('dir', 'auto');
			}
		});
	}

	private classifyPosts() {
		document.querySelectorAll<HTMLElement>('.post').forEach(post => {
			const messageText = post.querySelector<HTMLElement>('.post-message__text');
			const trimmedText = getDirectionalText(messageText ?? post);

			if (!trimmedText) {
				post.classList.remove('mm-rtl-persian-post', 'mm-rtl-persian-ltr-post', 'mm-rtl-persian-persian-post', 'mm-rtl-persian-neutral-post');
				return;
			}

			const direction = getTextDirection(trimmedText);
			const hasRtl = hasRtlStrongText(trimmedText);
			const isNeutral = !hasRtl && !hasLetter(trimmedText);

			post.classList.toggle('mm-rtl-persian-post', direction === 'rtl' || isNeutral);
			post.classList.toggle('mm-rtl-persian-ltr-post', direction === 'ltr');
			post.classList.toggle('mm-rtl-persian-persian-post', hasRtl);
			post.classList.toggle('mm-rtl-persian-neutral-post', isNeutral);
		});
	}

	private classifyDirectionalBlocks() {
		document.querySelectorAll<HTMLElement>(BLOCK_DIRECTION_TARGETS.join(',')).forEach(element => {
			const trimmedText = getDirectionalText(element);
			const direction = getTextDirection(trimmedText);

			setDirectionalClass(element, direction);
		});
	}

	private localizeTimestamps() {
		const showRelativeTime = true;

		document
			.querySelectorAll<HTMLTimeElement>('.post .post__header > .badges-wrapper .post__permalink .post__time')
			.forEach(timeElement => {
				const post = timeElement.closest<HTMLElement>('.post');

				if (!post) {
					return;
				}

				/**
				 * Important:
				 * same--root / same--user are grouped follow-up messages.
				 * Mattermost may create/show their timestamp on hover.
				 * Do not localize those, otherwise the hover timestamp gets huge
				 * and can go out of view.
				 */
				if (post.classList.contains('same--root') || post.classList.contains('same--user')) {
					this.restoreTimestamp(timeElement);
					return;
				}

				const badgesWrapper = timeElement.closest('.badges-wrapper');

				if (!badgesWrapper || !badgesWrapper.parentElement?.classList.contains('post__header')) {
					return;
				}

				const datetime = timeElement.getAttribute('datetime');

				if (!datetime) {
					return;
				}

				const date = new Date(datetime);

				if (Number.isNaN(date.getTime())) {
					return;
				}

				if (timeElement.dataset.mmRtlPersianLocalized !== 'true') {
					timeElement.dataset.mmRtlPersianOriginalText = timeElement.textContent ?? '';
					timeElement.dataset.mmRtlPersianLocalized = 'true';
				}

				const shouldUsePersianTime = post.classList.contains('mm-rtl-persian-persian-post') || post.classList.contains('mm-rtl-persian-post');

				if (shouldUsePersianTime) {
					const persianTime = PERSIAN_TIME_FORMATTER.format(date);
					const persianDate = formatPersianDate(date);

					timeElement.textContent = showRelativeTime
						? `${formatRelativeTime(date, 'fa')} - ${persianTime} - ${persianDate}`
						: `${persianTime} - ${persianDate}`;

					timeElement.setAttribute('dir', 'rtl');
					return;
				}

				const originalText = timeElement.dataset.mmRtlPersianOriginalText || timeElement.textContent || '';

				timeElement.textContent = showRelativeTime
					? `${formatRelativeTime(date, 'en')} - ${originalText}`
					: originalText;

				timeElement.setAttribute('dir', 'ltr');
			});
	}

	private restoreTimestamp(timeElement: HTMLTimeElement) {
		const originalText = timeElement.dataset.mmRtlPersianOriginalText;

		if (originalText) {
			timeElement.textContent = originalText;
		}

		delete timeElement.dataset.mmRtlPersianOriginalText;
		delete timeElement.dataset.mmRtlPersianLocalized;
		timeElement.removeAttribute('dir');
	}

	private restoreTimestamps() {
		document
			.querySelectorAll<HTMLTimeElement>('.post__time[data-mm-rtl-persian-localized="true"]')
			.forEach(timeElement => {
				this.restoreTimestamp(timeElement);
			});
	}

	private removeGeneratedClasses() {
		document.querySelectorAll<HTMLElement>(GENERATED_CLASS_NAMES.map(className => `.${className}`).join(',')).forEach(element => {
			element.classList.remove(...GENERATED_CLASS_NAMES);
		});
	}
}

window.registerPlugin?.(PLUGIN_ID, new Plugin());
