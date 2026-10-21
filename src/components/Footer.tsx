import { Row, IconButton, SmartLink, Text } from "@once-ui-system/core";
import { person as defaultPerson, social as defaultSocial } from "@/resources";
import type { SocialLink } from "@/lib/content/format";
import styles from "./Footer.module.scss";

// Props let the editor preview show unsaved name/link changes; the site uses the defaults.
export const Footer = ({
  name = defaultPerson.name,
  social = defaultSocial as SocialLink[],
  className,
}: {
  name?: string;
  social?: SocialLink[];
  className?: string;
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <Row as="footer" className={className} fillWidth padding="8" horizontal="center" s={{ direction: "column" }}>
      <Row
        className={styles.mobile}
        maxWidth="m"
        paddingY="8"
        paddingX="16"
        gap="16"
        horizontal="between"
        vertical="center"
        s={{
          direction: "column",
          horizontal: "center",
          align: "center",
        }}
      >
        <Text variant="body-default-s" onBackground="neutral-strong">
          <Text onBackground="neutral-weak">© {currentYear} /</Text>
          <Text paddingX="4">{name}</Text>
          <Text onBackground="neutral-weak">
            {/* Usage of this template requires attribution. Please don't remove the link to Once UI unless you have a Pro license. */}
            / Build your portfolio with{" "}
            <SmartLink href="https://once-ui.com/products/magic-portfolio">Once UI</SmartLink>
          </Text>
        </Text>
        <Row gap="16">
          {social.map(
            (item) =>
              item.link && (
                <IconButton
                  key={item.name}
                  href={item.link}
                  icon={item.icon as any}
                  tooltip={item.name}
                  size="s"
                  variant="ghost"
                />
              ),
          )}
        </Row>
      </Row>
      <Row height="80" hide s={{ hide: false }} />
    </Row>
  );
};
