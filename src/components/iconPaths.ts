// Ikoner ur designöverlämningen (kvitt-icons.svg), utan metadata. 24×24, ärver currentColor via .i { fill: currentColor }.
export const ICON_PATHS = {
  "cookie": "<path fill-rule=\"evenodd\" d=\"M15.48 2.09A10.5 10.5 0 1 0 21.91 8.52A4.6 4.6 0 0 1 15.48 2.09ZM8.2 8.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0ZM13.1 13.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0ZM7.4 15.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0Z\"></path>",
  "shoe": "<path fill-rule=\"evenodd\" d=\"M2.5 16.6V7.8Q2.5 6.5 3.8 6.5H8c.4 0 .7.3.9.7l.3.8c.6 1.4 1.9 2.4 3.5 2.6l4.2.6c1.6.2 3 1 4 2.2l.8 1 .3.9v1.3ZM9.6 14l1.7-1.7.8.8-1.7 1.7ZM13 14l1.7-1.7.8.8-1.7 1.7ZM2 17.6h20v.9a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5Z\"></path>",
  "close": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"></path></g>",
  "plus": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"></path></g>",
  "minus": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14\"></path></g>",
  "star": "<path stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\" d=\"M12 2.8l2.8 5.9 6.4.9-4.7 4.5 1.1 6.4L12 17.5l-5.6 3 1.1-6.4-4.7-4.5 6.4-.9z\"></path>",
  "star-off": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"><path d=\"M12 2.8l2.8 5.9 6.4.9-4.7 4.5 1.1 6.4L12 17.5l-5.6 3 1.1-6.4-4.7-4.5 6.4-.9z\"></path></g>",
  "clock": "<path fill-rule=\"evenodd\" d=\"M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20ZM11 6.5h2v5.1l3.2 1.9-1 1.7-4.2-2.5Z\"></path>",
  "trash": "<path fill-rule=\"evenodd\" d=\"M9.5 2.5h5l.7 1.5H20a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2h4.8ZM5.6 8h12.8l-.8 11.2a2.3 2.3 0 0 1-2.3 2.1H8.7a2.3 2.3 0 0 1-2.3-2.1ZM9.6 11h1.4v7H9.6ZM13 11h1.4v7H13Z\"></path>",
  "chevron": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 5l7 7-7 7\"></path></g>",
  "alert": "<path fill-rule=\"evenodd\" d=\"M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20ZM11 6.5h2v7h-2ZM12 15.2a1.3 1.3 0 1 1 0 2.6a1.3 1.3 0 0 1 0-2.6Z\"></path>",
} as const;

export type IconName = keyof typeof ICON_PATHS;
