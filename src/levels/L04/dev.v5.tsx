import Obstacle from './Obstacle'
import { boot } from './preview.v5'
import { useV5 } from '../../v5/core'

// dev-only: ?power pre-grants the ability the real chain gives at L05
if (new URLSearchParams(location.search).has('power')) useV5.getState().grant('power')

boot(Obstacle, 'L04')
