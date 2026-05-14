import styles from './styles.css?raw';
import fontUrl from './fonts/IRANSansWeb.ttf?url';

const PLUGIN_ID = 'ir.landin.mattermost-rtl';
const STYLE_ID = 'landin-rtl-styles';
const STORAGE_PREFIX = 'landin-rtl-enabled';

const RTL_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const LETTER_REGEX = /\p{L}/u;

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

function formatRelativeTime(date: Date) {
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

	return PERSIAN_RELATIVE_TIME_FORMATTER.format(Math.round(diffSeconds / secondsInUnit), unit);
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

		registry?.registerMainMenuAction?.('Toggle Landin RTL', () => {
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

		document.body.classList.remove('landin-rtl-enabled');
		document.getElementById(STYLE_ID)?.remove();
		this.restoreTimestamps();

		document.querySelectorAll('.landin-rtl-post, .landin-rtl-neutral-post').forEach(element => {
			element.classList.remove('landin-rtl-post', 'landin-rtl-neutral-post');
		});
	}

	private injectStyles() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = styles.replaceAll('__LANDIN_RTL_FONT_URL__', fontUrl);
		document.head.appendChild(style);
	}

	private isEnabled() {
		return localStorage.getItem(this.storageKey) !== 'false';
	}

	private setEnabled(enabled: boolean) {
		localStorage.setItem(this.storageKey, String(enabled));
		document.body.classList.toggle('landin-rtl-enabled', enabled);

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

		document.querySelectorAll('.landin-rtl-post, .landin-rtl-neutral-post').forEach(element => {
			element.classList.remove('landin-rtl-post', 'landin-rtl-neutral-post');
		});
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
			const trimmedText = messageText?.textContent?.trim() ?? '';

			if (!trimmedText) {
				post.classList.remove('landin-rtl-post', 'landin-rtl-neutral-post');
				return;
			}

			const isRtl = RTL_REGEX.test(trimmedText);
			const isNeutral = !isRtl && !LETTER_REGEX.test(trimmedText);

			post.classList.toggle('landin-rtl-post', isRtl || isNeutral);
			post.classList.toggle('landin-rtl-neutral-post', isNeutral);
		});
	}

	private localizeTimestamps() {
		document
			.querySelectorAll<HTMLTimeElement>(
				'.post.landin-rtl-post .post__header > .badges-wrapper .post__permalink .post__time',
			)
			.forEach(timeElement => {
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

				const relativeTime = formatRelativeTime(date);
				const persianTime = PERSIAN_TIME_FORMATTER.format(date);
				const persianDate = formatPersianDate(date);

				if (timeElement.dataset.landinRtlLocalized !== 'true') {
					timeElement.dataset.landinRtlOriginalText = timeElement.textContent ?? '';
					timeElement.dataset.landinRtlLocalized = 'true';
				}

				timeElement.textContent = `${relativeTime} - ${persianTime} - ${persianDate}`;
				timeElement.setAttribute('dir', 'rtl');
			});
	}

	private restoreTimestamps() {
		document
			.querySelectorAll<HTMLTimeElement>('.post__time[data-landin-rtl-localized="true"]')
			.forEach(timeElement => {
				const originalText = timeElement.dataset.landinRtlOriginalText;

				if (originalText) {
					timeElement.textContent = originalText;
				}

				delete timeElement.dataset.landinRtlOriginalText;
				delete timeElement.dataset.landinRtlLocalized;
				timeElement.removeAttribute('dir');
			});
	}
}

window.registerPlugin?.(PLUGIN_ID, new Plugin());
