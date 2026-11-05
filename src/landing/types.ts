/** Props the landing page keeps from the lab: production always renders hero, light, live. */
export interface LabOptionProps {
  screen: 'hero' | 'light' | 'story' | 'mobile' | 'm';
  mode: 'dark' | 'light';
  thumb: boolean;
}
